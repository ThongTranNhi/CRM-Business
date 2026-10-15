import { app } from './app';
import { readEnv, type Bindings } from './config/env';
import { generateDueNotifications } from './modules/notifications/notifications.service';

export default {
  fetch: app.fetch,
  // Cron Trigger (wrangler.toml [triggers]): thông báo sắp đến hạn / quá hạn mỗi sáng. Lỗi → Cloudflare ghi log
  // của lần chạy; lần chạy sau vẫn gửi (RPC không tạo trùng).
  scheduled(_controller, bindings, ctx) {
    ctx.waitUntil(generateDueNotifications(readEnv(bindings)).then(() => undefined));
  },
} satisfies ExportedHandler<Bindings>;
