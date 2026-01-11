
/**
 * FCM 推送集成插件实现
 * 严格保留 registration 和 pushNotificationReceived 监听器
 */
export interface NotifyPlugin {
  triggerNotify(title: string, message: string): Promise<void>;
  notifyTask(options: any): Promise<void>;
  cancelTask(options: { id: any }): Promise<void>;
  requestPermission(): Promise<{ display: any }>;
  checkPermission(): Promise<{ display: any }>;
  initPush(): Promise<string | null>;
  addListener(callback: (notification: any) => void): (() => void);
}

class NotifyImplementation implements NotifyPlugin {
  
  private getCapacitor() {
    return (window as any).Capacitor;
  }

  /**
   * 获取 FCM Token 并注册监听器
   * 对应要求点 2：PushNotifications.addListener('registration', ...)
   */
  async initPush(): Promise<string | null> {
    const Capacitor = this.getCapacitor();
    if (!Capacitor || Capacitor.getPlatform() === 'web') return null;

    try {
        const PushNotifications = Capacitor.Plugins.PushNotifications;
        if (!PushNotifications) return null;

        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive !== 'granted') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive === 'granted') {
          return new Promise((resolve) => {
            // 核心：注册 Token 监听
            const successListener = PushNotifications.addListener('registration', (token: { value: string }) => {
              console.log("[FCM] Token Registered:", token.value);
              successListener.remove(); 
              resolve(token.value);
            });
            
            const errorListener = PushNotifications.addListener('registrationError', (err: any) => {
                console.error("[FCM] Registration Error:", err);
                errorListener.remove();
                resolve(null);
            });

            PushNotifications.register();
            // 15秒超时保护
            setTimeout(() => resolve(null), 15000);
          });
        }
    } catch (e) { console.error("FCM Init Error:", e); }
    return null;
  }

  /**
   * 监听前台消息
   * 对应要求点 3：PushNotifications.addListener('pushNotificationReceived', ...)
   */
  addListener(callback: (notification: any) => void): (() => void) {
    const Capacitor = this.getCapacitor();
    const PushNotifications = Capacitor?.Plugins?.PushNotifications;
    
    if (PushNotifications && Capacitor.getPlatform() !== 'web') {
        const handler = PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
            console.log("[FCM] Received in foreground:", notification);
            callback(notification);
        });
        return () => {
          handler.remove();
        };
    }
    return () => {};
  }

  async triggerNotify(title: string, message: string): Promise<void> {
    const Capacitor = this.getCapacitor();
    
    // 如果是 Web 平台或 Native 接口调用失败，走 UI 弹窗
    if (!Capacitor || Capacitor.getPlatform() === 'web') {
        this.triggerUIFallback(title, message);
        return;
    }

    // 调用原生通知接口 (本地触发)
    const LocalNotifications = Capacitor.Plugins.LocalNotifications;
    if (LocalNotifications) {
        try {
            await LocalNotifications.schedule({
                notifications: [{
                    title,
                    body: message,
                    id: Date.now(),
                    schedule: { at: new Date(Date.now() + 100) },
                    sound: 'default'
                }]
            });
        } catch (e) {
            this.triggerUIFallback(title, message);
        }
    } else {
        this.triggerUIFallback(title, message);
    }
  }

  private triggerUIFallback(title: string, body: string) {
    const event = new CustomEvent('app-ui-notification', { 
        detail: { title, body, timestamp: new Date() } 
    });
    window.dispatchEvent(event);
  }

  async notifyTask(options: any): Promise<void> {
    await this.triggerNotify(options.title || "提醒", options.description || options.body || "");
  }

  async cancelTask(options: { id: any }): Promise<void> { }

  async checkPermission(): Promise<{ display: any }> {
      const Capacitor = this.getCapacitor();
      if (!Capacitor || Capacitor.getPlatform() === 'web') return { display: 'granted' };
      const status = await Capacitor.Plugins.PushNotifications?.checkPermissions();
      return { display: status?.receive || 'prompt' };
  }

  async requestPermission(): Promise<{ display: any }> {
      const Capacitor = this.getCapacitor();
      if (!Capacitor || Capacitor.getPlatform() === 'web') return { display: 'granted' };
      const status = await Capacitor.Plugins.PushNotifications?.requestPermissions();
      return { display: status?.receive || 'prompt' };
  }
}

export const Notify = new NotifyImplementation();
