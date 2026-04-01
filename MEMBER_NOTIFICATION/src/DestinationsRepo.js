// DestinationsRepo.gs

/**
 * Config_Destinations:
 *  - destination_code
 *  - dest_name
 *  - webhook_url
 *
 * 互換対応:
 *  - 旧ヘッダ dest_id も暫定許容する
 */
function loadDestinations_(masterSs) {
  const sh = mustSheet_(masterSs, 'Config_Destinations');
  const { header, rows } = getHeaderAndRows_(sh);

  const hasDestinationCode = header.indexOf('destination_code') >= 0;
  const hasDestId = header.indexOf('dest_id') >= 0;

  if (!hasDestinationCode && !hasDestId) {
    throw new Error('Config_Destinations: destination_code (or legacy dest_id) is required');
  }

  assertHeaderHasKeys_('Config_Destinations', header, ['dest_name', 'webhook_url']);
  const idx = indexMap_(header);
  const keyCol = hasDestinationCode ? 'destination_code' : 'dest_id';

  const map = {};
  rows.forEach(r => {
    const destinationCode = String(r[idx[keyCol]] || '').trim();
    if (!destinationCode) return;

    map[destinationCode] = {
      destination_code: destinationCode,
      dest_name: String(r[idx.dest_name] || '').trim(),
      webhook_url: String(r[idx.webhook_url] || '').trim(),
    };
  });
  return map;
}
