'use strict';
const https = require('https');

const API = 'https://jsonplaceholder.typicode.com';
const PRINT_COUNT = 5; 
const byTitleLengthDesc = (items) =>
  items.slice().sort((x, y) => y.title.length - x.title.length);
const byAuthorName = (items) =>
  items.slice().sort((x, y) => x.name.localeCompare(y.name));
const onlyContactFields = (items) =>
  items.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    phone: u.phone,
  }));
const onlyUndone = (items) => items.filter((t) => t.completed === false);
function printResult(title, items) {
  console.log(`\n--- ${title} | элементов: ${items.length} ---`);
  console.log(JSON.stringify(items.slice(0, PRINT_COUNT), null, 2));
}
function requestWithCallback(endpoint, done) {
  const req = https.get(`${API}${endpoint}`, (res) => {
    const parts = [];
    res.on('data', (part) => parts.push(part));
    res.on('end', () => {
      try {
        done(null, JSON.parse(Buffer.concat(parts).toString('utf8')));
      } catch (e) {
        done(e);
      }
    });
  });
  req.on('error', done);
}

function loadPostsCb(done) {
  requestWithCallback('/posts', (err, list) =>
    err ? done(err) : done(null, byTitleLengthDesc(list))
  );
}

function loadCommentsCb(done) {
  requestWithCallback('/comments', (err, list) =>
    err ? done(err) : done(null, byAuthorName(list))
  );
}
function requestWithPromise(endpoint) {
  return fetch(API + endpoint).then((r) => r.json());
}

function loadUsersPromise() {
  return requestWithPromise('/users').then(onlyContactFields);
}

function loadTodosPromise() {
  return requestWithPromise('/todos').then(onlyUndone);
}
async function requestAsync(endpoint) {
  const r = await fetch(API + endpoint);
  return r.json();
}

async function loadPostsAsync() {
  const list = await requestAsync('/posts');
  return byTitleLengthDesc(list);
}

async function loadCommentsAsync() {
  const list = await requestAsync('/comments');
  return byAuthorName(list);
}

async function loadUsersAsync() {
  const list = await requestAsync('/users');
  return onlyContactFields(list);
}

async function loadTodosAsync() {
  const list = await requestAsync('/todos');
  return onlyUndone(list);
}
const results = {};
function stepCallbacks(next) {
  loadPostsCb((err, posts) => {
    if (err) return console.error('callbacks /posts:', err.message);
    results.cbPosts = posts;
    printResult('Коллбэки: /posts (title по убыванию длины)', posts);

    loadCommentsCb((err2, comments) => {
      if (err2) return console.error('callbacks /comments:', err2.message);
      results.cbComments = comments;
      printResult('Коллбэки: /comments (по имени)', comments);
      next();
    });
  });
}

function stepPromises() {
  return loadUsersPromise()
    .then((users) => {
      results.prUsers = users;
      printResult('Промисы: /users (5 полей)', users);
      return loadTodosPromise();
    })
    .then((todos) => {
      results.prTodos = todos;
      printResult('Промисы: /todos (completed = false)', todos);
    })
    .catch((e) => console.error('promises:', e.message));
}

async function stepAsync() {
  try {
    results.asPosts = await loadPostsAsync();
    printResult('async/await: /posts', results.asPosts);

    results.asComments = await loadCommentsAsync();
    printResult('async/await: /comments', results.asComments);

    results.asUsers = await loadUsersAsync();
    printResult('async/await: /users', results.asUsers);

    results.asTodos = await loadTodosAsync();
    printResult('async/await: /todos', results.asTodos);
  } catch (e) {
    console.error('async/await:', e.message);
  }
}

stepCallbacks(() => {
  stepPromises().then(stepAsync);
});
