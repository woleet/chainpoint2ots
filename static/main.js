/* eslint-disable consistent-return */

function postJson(url, data) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then((res) => {
    if (res.status !== 200) {
      return res.text()
        .then((text) => {
          throw new Error(text);
        });
    }

    return res.blob();
  });
}

function readJson(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = function (e) {
      try {
        resolve(JSON.parse(e.target.result));
      } catch (err) {
        reject(new Error(`Bad receipt format: ${err.message}`));
      }
    };

    reader.readAsText(file);
  });
}

function checkReceipt(chainpoint) {

  const context = chainpoint['@context'] || chainpoint.context;

  if (!context)
    throw new Error('Missing @context attribute');

  // Check chainpoint file
  const CHAINPOINT_V2 = 'https://w3id.org/chainpoint/v2';
  if (Array.isArray(context) ? !context.includes(CHAINPOINT_V2)
    : context !== CHAINPOINT_V2)
    throw new Error('Support only chainpoint v2');

  if (chainpoint.type !== 'ChainpointSHA256v2')
    throw new Error('Support only ChainpointSHA256v2');

  if (chainpoint.anchors === undefined)
    throw new Error('Support only timestamps with attestations');

}

function display(text, level = 'danger') {
  const input = document.getElementById('input');

  if (level !== 'info')
    input.removeAttribute('disabled');

  const dropZone = document.getElementById('dz');
  dropZone.style.display = 'block';

  const helper = document.getElementById('helper');
  helper.setAttribute('class', `panel panel-${level}`);
  helper.innerHTML = text ? `<div class="panel-heading">${text}</div>` : '';
}

async function convert(files) {
  const file = files[0];

  const input = document.getElementById('input');
  const download = document.getElementById('download');
  download.setAttribute('hidden', '');
  input.setAttribute('disabled', '');
  const a = download.getElementsByTagName('a')[0];
  const dropZone = document.getElementById('dz');
  dropZone.style.display = 'none';

  if (file.type !== 'application/json')
    return display('Bad file type: expecting a Chainpoint 2 JSON file.');

  const chainpoint = await readJson(file);

  try {
    checkReceipt(chainpoint);
    display('Performing conversion...', 'info');
    const blob = await postJson('/', chainpoint);
    a.href = window.URL.createObjectURL(blob);
    display(null);
    a.download = `${file.name.endsWith('.json') ? file.name.slice(0, -5) : file.name}.ots`;
    download.removeAttribute('hidden');
  } catch (err) {
    return display(err.message);
  }
};
