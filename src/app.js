const webby = require('./webby.js');
const path = require('path');
const app = new webby.App();

app.use(webby.static(path.join(__dirname, '..', 'public')));

app.get('/', function (req, res) {
  res.send('<link rel="stylesheet" href="/css/styles.css">');
});

function template() {
  let html = `<link rel="stylesheet" href="/css/styles.css">`;
  const num = Math.floor(Math.random() * 3) + 1;
  if (num === 1) {
    html += `<h1>Here is ${num} picture of a cow!</h1>`;
  } else {
    html += `<h1>Here are ${num} pictures of cows!</h1>`;
  }

  for (let i = 0; i < num; i++) {
    const x = Math.floor(Math.random() * 4) + 1;
    html += `<div><img src='/img/animal${x}.jpg'></img></div>`;
  }

  html += `<a href="/"><em>&#60;Back</em></a>`;

  return html;
}


app.get('/gallery', function (req, res) {
  const gallery = template();
  res.send(gallery);
});

app.get('/pics', function (req, res) {
  res.statusCode = 308;
  res.set('Location', '/gallery');
  res.send('');
});

app.listen(3000, '127.0.0.1');


