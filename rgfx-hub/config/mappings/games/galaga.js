// Galaga mapper - see pacman.js for format example
export function handle({ subject, property }, _payload, { broadcast }) {

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

  // Player ship movement - blue pulse
  if (subject === "player" && property === "ship") {
    return broadcast({
      effect: "pulse",
      props: { color: "#0000FF" },
    });
  }
}
