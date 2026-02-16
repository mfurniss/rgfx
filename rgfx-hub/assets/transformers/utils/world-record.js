// ROM name → Aurcade game ID lookup table
const AURCADE_IDS = {
  defender: 66,
  pacman: 10,
  galaga: 12,
  robotron: 185,
  starwars: 207,
  // Add more as needed
};

/**
 * Fetch world record score for a MAME ROM
 * @param {string} romName - ROM name (e.g., 'pacman', 'galaga')
 * @param {object} ctx - Transformer context with http and log
 * @returns {Promise<{score: string, player: string, date: string} | null>}
 */
export async function getWorldRecord(romName, { http, log }) {
  const gameId = AURCADE_IDS[romName];

  if (!gameId) {
    log.info(`World record: ROM "${romName}" not in Aurcade lookup table`);
    return null;
  }

  const url = `https://aurcade.com/games/view.aspx?id=${gameId}`;
  log.info(`World record: Fetching ${url}`);

  try {
    const response = await http.get(url);
    const html = await response.text();
    log.debug(`World record: Received ${html.length} bytes`);

    const record = parseWorldRecord(html);

    if (!record) {
      log.warn(`World record: Could not parse record from page`);
      return null;
    }

    record.romName = romName;

    log.info(
      `World record for ${romName}: ${record.score} by ${record.player} on ${record.date}`,
    );

    return record;
  } catch (err) {
    log.error(`World record: Fetch failed - ${err.message}`);
    return null;
  }
}

function parseWorldRecord(html) {
  // HTML structure from Aurcade:
  // <span class="format-top-score">3,333,360</span><br />
  // <b>Player Name</b><br />
  // 07/03/99<br />

  // Score: inside <span class="format-top-score">
  const scoreMatch = html.match(
    /<span class="format-top-score">([^<]+)<\/span>/,
  );
  const score = scoreMatch ? scoreMatch[1] : null;

  // Player: inside <b> tag after the score
  const playerMatch = html.match(
    /<span class="format-top-score">[^<]+<\/span><br \/>\s*<b>([^<]+)<\/b>/,
  );
  const player = playerMatch ? playerMatch[1] : null;

  // Date: MM/DD/YY pattern after player name
  const dateMatch = html.match(/<b>[^<]+<\/b><br \/>\s*(\d{2}\/\d{2}\/\d{2})/);
  const date = dateMatch ? dateMatch[1] : null;

  if (!score) return null;

  return { score, player, date };
}
