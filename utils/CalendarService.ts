
export class CalendarService {
  private static getPlugin() {
    return (window as any).plugins?.calendar;
  }

  public static isAvailable(): boolean {
    return !!this.getPlugin();
  }

  public static async hasReadWritePermission(): Promise<boolean> {
    const plugin = this.getPlugin();
    if (!plugin) return false;

    return new Promise((resolve) => {
      plugin.hasReadWritePermission((result: boolean) => {
        resolve(result);
      });
    });
  }

  public static async requestReadWritePermission(): Promise<boolean> {
    const plugin = this.getPlugin();
    if (!plugin) return false;

    return new Promise((resolve) => {
      plugin.requestReadWritePermission((result: boolean) => {
        resolve(result);
      });
    });
  }

  /**
   * 查找日历事件是否存在
   */
  public static async findEvent(
    title: string,
    location: string,
    notes: string,
    startDate: string,
    endDate: string
  ): Promise<boolean> {
      const plugin = this.getPlugin();
      if (!plugin) return false;

      const start = new Date(startDate);
      start.setHours(9, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(18, 0, 0, 0);

      return new Promise((resolve) => {
          plugin.findEvent(title, location, notes, start, end, (events: any[]) => {
              resolve(events && events.length > 0);
          }, () => resolve(false));
      });
  }

  /**
   * 创建日历事件 (幂等操作：如果存在则不重复创建，或者先删后建)
   * @param interactive 是否打开原生编辑页面
   */
  public static async createEvent(
    title: string,
    location: string,
    notes: string,
    startDate: string,
    endDate: string,
    interactive: boolean = false
  ): Promise<void> {
    const plugin = this.getPlugin();
    if (!plugin) {
      console.warn("Calendar plugin not found");
      return;
    }

    // 1. 先检查是否存在，防止重复 (Deduplication)
    const exists = await this.findEvent(title, location, notes, startDate, endDate);
    if (exists) {
        // 如果已存在且不是交互模式，直接返回，视为成功
        if (!interactive) {
            console.log("Event already exists in calendar, skipping.");
            return;
        }
        // 如果是交互模式或者需要强制更新，可以先删除旧的 (Optional strategy)
    }

    const start = new Date(startDate);
    start.setHours(9, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(18, 0, 0, 0);

    return new Promise((resolve, reject) => {
      const success = (msg: string) => {
        console.log("Calendar Success: " + msg);
        resolve();
      };
      const error = (msg: string) => {
        console.error("Calendar Error: " + msg);
        reject(msg);
      };

      if (interactive) {
        plugin.createEventInteractively(title, location, notes, start, end, success, error);
      } else {
        plugin.createEvent(title, location, notes, start, end, success, error);
      }
    });
  }

  /**
   * 删除日历事件
   */
  public static async deleteEvent(
    title: string,
    location: string,
    notes: string,
    startDate: string,
    endDate: string
  ): Promise<void> {
    const plugin = this.getPlugin();
    if (!plugin) return;

    const start = new Date(startDate);
    start.setHours(9, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(18, 0, 0, 0);

    return new Promise((resolve) => {
      plugin.deleteEvent(title, location, notes, start, end, () => resolve(), () => resolve());
    });
  }

  public static async openCalendar(dateStr?: string): Promise<void> {
    const plugin = this.getPlugin();
    if (!plugin) return;
    
    const date = dateStr ? new Date(dateStr) : new Date();
    plugin.openCalendar(date);
  }
}
