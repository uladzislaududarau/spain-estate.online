// Some Workers Static Assets responses ignore Range. Safari probes with bytes=0-1.
export async function serveCinemaVideo(request, assets) {
  const asset = await assets.fetch(request);
  if (asset.status !== 200 && asset.status !== 206) return asset;
  const headers = new Headers(asset.headers);
  headers.set('Cache-Control', 'public, max-age=3600');
  headers.set('Accept-Ranges', 'bytes');

  const range = request.headers.get('Range');
  const validator = request.headers.get('If-Range');
  const size = Number(headers.get('Content-Length') || headers.get('X-Cinema-Length'));
  headers.delete('X-Cinema-Length');
  if (asset.status === 206 || request.method !== 'GET' || !range || !size ||
      (validator && validator !== headers.get('ETag') && validator !== headers.get('Last-Modified'))) {
    return new Response(asset.body, { status: asset.status, headers });
  }
  // Unknown units and multipart ranges may be answered with the full representation.
  const match = /^bytes=(\d*)-(\d*)$/i.exec(range);
  if (!match || (!match[1] && !match[2])) return new Response(asset.body, { headers });
  const first = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const last = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  if (first > last) {
    await asset.body.cancel();
    headers.set('Content-Range', 'bytes */' + size);
    headers.set('Content-Length', '0');
    return new Response(null, { status: 416, headers });
  }

  const length = last - first + 1;
  headers.set('Content-Range', `bytes ${first}-${last}/${size}`);
  headers.set('Content-Length', String(length));
  if (length === size) return new Response(asset.body, { status: 206, headers });

  // Stream the requested interval with backpressure. Stop reading at its final byte.
  let offset = 0;
  const slice = new TransformStream({
    transform(chunk, controller) {
      const begin = Math.max(0, first - offset);
      const end = Math.min(chunk.length, last + 1 - offset);
      if (begin < end) controller.enqueue(chunk.subarray(begin, end));
      offset += chunk.length;
      if (offset > last) controller.terminate();
    }
  });
  const output = new FixedLengthStream(length);
  // pipeTo propagates read errors and client cancellation to the opposite side.
  asset.body.pipeThrough(slice).pipeTo(output.writable).catch(() => {});
  return new Response(output.readable, { status: 206, headers });
}
