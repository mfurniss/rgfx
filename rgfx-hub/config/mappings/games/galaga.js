// Galaga mapper - see pacman.js for format example
export function handle(topic, _payload, { broadcast }) {
  const [, subject, property] = topic.split("/");

  if (subject === "player" && property === "score") {
    return broadcast({
      effect: "pulse",
      props: { color: "#FFFF00" },
    });
  }

  // Player fired missile - green pulse
  if (subject === "player" && property === "fired") {
    return broadcast({
      effect: "pulse",
      props: { color: "#00FF00" },
    });
  }
}
