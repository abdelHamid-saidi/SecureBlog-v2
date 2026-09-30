const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'db.json');

function emptyDb() {
  return { users: [], articles: [] };
}

function load() {
  try {
    const raw = fs.readFileSync(dbPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      articles: Array.isArray(parsed.articles) ? parsed.articles : [],
    };
  } catch (err) {
    if (err.code === 'ENOENT') return emptyDb();
    throw err;
  }
}

function save(db) {
  fs.mkdirSync(dataDir, { recursive: true });
  const tmpPath = `${dbPath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2));
  fs.renameSync(tmpPath, dbPath);
}

function findUserByEmail(email) {
  return load().users.find((user) => user.email === email) || null;
}

function createUser(email, passwordHash) {
  const db = load();
  const user = {
    id: crypto.randomUUID(),
    email,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  save(db);
  return user;
}

function listArticles() {
  return load()
    .articles
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((article) => ({
      id: article.id,
      title: article.title,
      content: article.content,
      createdAt: article.createdAt,
    }));
}

function createArticle(authorEmail, title, content) {
  const db = load();
  const article = {
    id: crypto.randomUUID(),
    title,
    content,
    authorEmail,
    createdAt: new Date().toISOString(),
  };
  db.articles.push(article);
  save(db);
  return {
    id: article.id,
    title: article.title,
    content: article.content,
    createdAt: article.createdAt,
  };
}

module.exports = {
  findUserByEmail,
  createUser,
  listArticles,
  createArticle,
};
