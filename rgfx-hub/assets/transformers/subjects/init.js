import { getWorldRecord } from "../utils/world-record.js";

export async function transform({ namespace, subject, payload }, ctx) {
  if (subject !== "init") {
    return false;
  }

  ctx.broadcast({ effect: "clear" });

  getWorldRecord(namespace, ctx).then((wr) => {
    if (wr) {
      ctx.broadcast({
        effect: "scroll_text",
        drivers: ["rgfx-driver-0005"],
        props: {
          reset: true,
          text: `${wr.romName.toUpperCase()} WR: ${wr.score} by ${wr.player}, ${
            wr.date
          }`,
          repeat: false,
          color: "#808000",
          accentColor: "#006060",
          speed: 250,
          snapToLed: false,
        },
      });
    }
  });

  return false;
}
