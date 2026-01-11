
# Supabase Database Webhook & Cron 推送配置 (全自动版)

为了实现任务新增、修改、逾期后的“手机实时通知”，请按照以下步骤配置 Supabase：

### 1. Webhook 基础设置 (用于实时通知)
在 Supabase 控制台导航至：**Database** -> **Webhooks**，点击 **Create a new webhook**：

1.  **Name**: `notify_task_event`
2.  **Table**: `tasks`
3.  **Events**: 勾选 **`INSERT`** 和 **`UPDATE`**
4.  **Webhook Configuration**:
    *   **Type**: `HTTP Request`
    *   **Method**: `POST`
    *   **URL**: `https://[你的项目ID].supabase.co/functions/v1/fcm-notifier`
    *   **HTTP Headers**:
        *   `Authorization`: `Bearer [你的 SERVICE_ROLE_KEY]`

### 2. 设置触发条件 (Webhook Conditions)
在 Webhook 配置界面的 **Conditions** 部分：
*   **选择模式**: `Advanced` (SQL Condition)
*   **填入 SQL**:
    ```sql
    -- 仅当 remineded 时间发生变化时才触发，防止修改普通字段时产生重复通知
    (target_table_name).last_reminded_at IS DISTINCT FROM (old_record).last_reminded_at
    ```

### 3. (高级) 纯后端逾期标记自动检测
可以在 Supabase 的 **SQL Editor** 运行以下脚本：

```sql
-- 确保启用了 pg_cron 扩展
create extension if not exists pg_cron;

-- 创建定时任务：每小时检查一次逾期任务并打上提醒标记（会触发 Webhook）
select cron.schedule(
  'auto-check-overdue',
  '0 * * * *', -- 每小时第0分钟执行
  $$
  update public.tasks
  set last_reminded_at = now()
  where status = 'pending' 
    and end_date < current_date
    and (last_reminded_at is null or last_reminded_at < current_date);
  $$
);
```

### 4. 每日 18:00 逾期汇总通知
在 SQL Editor 中运行以下脚本。该脚本会统计每个人的逾期总数并直接通过 HTTP POST 发送：

```sql
-- 确保启用了 pg_net 扩展
create extension if not exists pg_net;

-- 创建每日 18:00 逾期汇总任务
-- Supabase 使用 UTC 时间。北京时间 18:00 = UTC 10:00
select cron.schedule(
  'daily-overdue-summary-18pm',
  '0 10 * * *', 
  $$
  with overdue_data as (
    select 
      employee_id, 
      count(*) as overdue_count
    from public.tasks
    where status = 'pending' 
      and end_date < current_date
    group by employee_id
  )
  select
    net.http_post(
      url := 'https://nfezefbvmhotjunenmuv.supabase.co/functions/v1/fcm-notifier',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZXplZmJ2bWhvdGp1bmVubXV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTUzODk5NCwiZXhwIjoyMDgxMTE0OTk0fQ.6ovgAX684ZgSh44fRdQgNxCdsrWgGyVyYPrvfUm8e8I'
      ),
      body := jsonb_build_object(
        'targetEmployeeId', employee_id,
        'title', '每日逾期汇总',
        'body', '截止目前，您有 ' || overdue_count || ' 项任务已逾期，请及时处理。'
      )
    )
  from overdue_data;
  $$
);
```
