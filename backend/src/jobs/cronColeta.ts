import cron from "node-cron";
import { queryOne } from "../db/index.js";
import { runColeta } from "../services/coletor.js";
import { processarAlertas } from "../services/alertas.js";

export function iniciarCron() {
  // Todo dia às 06h10
  cron.schedule("10 6 * * *", async () => {
    const cfg = await queryOne<{ valor: string }>(
      "SELECT valor FROM configuracoes WHERE chave = 'cron_ativo'"
    );
    if (cfg?.valor === "0") {
      console.log("[CRON] Pausado por configuração.");
      return;
    }
    console.log("[CRON] Iniciando coleta diária...");
    await runColeta();
    console.log("[CRON] Processando alertas...");
    await processarAlertas();
  });

  console.log("⏰ Cron job agendado para 06h10 diariamente.");
}