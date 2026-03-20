// DestinationsRepo.gs

/**
 * Config_Destinations:
 *  - dest_id
 *  - dest_name
 *  - webhook_url
 */
function loadDestinations_(ss) {
  const sh = mustSheet_(ss, 'Config_Destinations');
  const { header, rows } = getHeaderAndRows_(sh);

  assertHeaderHasKeys_('Config_Destinations', header, ['dest_id', 'dest_name', 'webhook_url']);
  const idx = indexMap_(header);

  const map = {};
  rows.forEach(r => {
    const destId = String(r[idx.dest_id] || '').trim();
    if (!destId) return;
    map[destId] = {
      dest_id: destId,
      dest_name: String(r[idx.dest_name] || '').trim(),
      webhook_url: String(r[idx.webhook_url] || '').trim(),
    };
  });
  return map;
}