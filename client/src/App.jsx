import { useEffect, useState } from 'react';
import { api } from './api';

function formatDate(iso) {
  const date = new Date(iso);
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function ErrorText({ message }) {
  if (!message) return null;
  return <p className="error">{message}</p>;
}

function LoginView({ error, pending, onSubmit, onShowRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <main className="screen">
      <article className="card">
        <p className="kicker">Fil rouge authentification</p>
        <h1>SecureBlog</h1>
        <p className="subtitle">v2 — JWT</p>
        <h2>Connexion</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(email, password);
          }}
        >
          <input
            name="email"
            type="email"
            placeholder="Email"
            aria-label="Email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Mot de passe (8 caractères minimum)"
            aria-label="Mot de passe"
            minLength={8}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <ErrorText message={error} />
          <button type="submit" disabled={pending}>Se connecter</button>
        </form>
        <button className="text-link" type="button" onClick={onShowRegister}>
          Créer un compte
        </button>
      </article>
    </main>
  );
}

function RegisterView({ error, pending, onSubmit, onShowLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <main className="screen">
      <article className="card">
        <p className="kicker">Fil rouge authentification</p>
        <h1>SecureBlog</h1>
        <p className="subtitle">v2 — JWT</p>
        <h2>Inscription</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(email, password);
          }}
        >
          <input
            name="email"
            type="email"
            placeholder="Email"
            aria-label="Email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Mot de passe (8 caractères minimum)"
            aria-label="Mot de passe"
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <ErrorText message={error} />
          <button type="submit" disabled={pending}>Créer le compte</button>
        </form>
        <button className="text-link" type="button" onClick={onShowLogin}>
          J'ai déjà un compte
        </button>
      </article>
    </main>
  );
}

function Articles({ articles }) {
  if (!articles.length) {
    return <p className="empty">Aucun article pour le moment.</p>;
  }

  return articles.map((article) => (
    <article className="article" key={article.id}>
      <h3>{article.title}</h3>
      <p>{article.content}</p>
      <time dateTime={article.createdAt}>{formatDate(article.createdAt)}</time>
    </article>
  ));
}

function AppView({ email, articles, error, pending, onLogout, onPublish }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  return (
    <main className="screen">
      <section className="shell">
        <header className="app-header">
          <div>
            <p className="kicker">Fil rouge authentification</p>
            <h1>SecureBlog</h1>
            <p className="subtitle">v2 — JWT</p>
          </div>
          <button className="ghost" type="button" onClick={onLogout} disabled={pending}>
            Se déconnecter
          </button>
        </header>

        <section className="panel">
          <p className="welcome">
            Bienvenue, <strong>{email}</strong>
          </p>
          <p className="hint">
            Votre accès repose sur un JWT de 15 minutes, transmis dans un cookie HttpOnly, Secure et SameSite.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onPublish(title, content, () => {
                setTitle('');
                setContent('');
              });
            }}
          >
            <input
              name="title"
              type="text"
              placeholder="Titre"
              aria-label="Titre"
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
            <textarea
              name="content"
              placeholder="Contenu"
              aria-label="Contenu"
              maxLength={5000}
              rows={3}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              required
            />
            <ErrorText message={error} />
            <button type="submit" disabled={pending}>Publier</button>
          </form>
        </section>

        <section className="articles">
          <h2>Articles</h2>
          <div id="articles">
            <Articles articles={articles} />
          </div>
        </section>
      </section>
    </main>
  );
}

export default function App() {
  const [view, setView] = useState('loading');
  const [email, setEmail] = useState('');
  const [articles, setArticles] = useState([]);
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [postError, setPostError] = useState('');
  const [pending, setPending] = useState(false);

  async function openApp(nextEmail) {
    const data = await api('/api/articles');
    setEmail(nextEmail);
    setArticles(data.articles);
    setPostError('');
    setView('app');
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const me = await api('/api/auth/me');
        if (cancelled) return;
        const data = await api('/api/articles');
        if (cancelled) return;
        setEmail(me.email);
        setArticles(data.articles);
        setView('app');
      } catch (err) {
        if (cancelled) return;
        if (err.status !== 401) setLoginError(err.message);
        setView('login');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function submitAuth(path, nextEmail, password, setError) {
    setError('');
    setPending(true);
    try {
      const user = await api(path, {
        method: 'POST',
        body: JSON.stringify({ email: nextEmail, password }),
      });
      await openApp(user.email);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  async function logout() {
    setPending(true);
    try {
      await api('/api/auth/logout', { method: 'POST', body: '{}' });
      setEmail('');
      setArticles([]);
      setPostError('');
      setLoginError('');
      setView('login');
    } catch (err) {
      setPostError(err.message);
    } finally {
      setPending(false);
    }
  }

  async function publish(title, content, reset) {
    setPostError('');
    setPending(true);
    try {
      await api('/api/articles', {
        method: 'POST',
        body: JSON.stringify({ title, content }),
      });
      const data = await api('/api/articles');
      setArticles(data.articles);
      reset();
    } catch (err) {
      setPostError(err.message);
      if (err.status === 401) {
        setLoginError(err.message);
        setView('login');
      }
    } finally {
      setPending(false);
    }
  }

  if (view === 'loading') {
    return (
      <main className="screen">
        <p className="subtitle">Chargement…</p>
      </main>
    );
  }

  if (view === 'register') {
    return (
      <RegisterView
        error={registerError}
        pending={pending}
        onShowLogin={() => {
          setRegisterError('');
          setView('login');
        }}
        onSubmit={(nextEmail, password) => {
          submitAuth('/api/auth/register', nextEmail, password, setRegisterError);
        }}
      />
    );
  }

  if (view === 'app') {
    return (
      <AppView
        email={email}
        articles={articles}
        error={postError}
        pending={pending}
        onLogout={logout}
        onPublish={publish}
      />
    );
  }

  return (
    <LoginView
      error={loginError}
      pending={pending}
      onShowRegister={() => {
        setLoginError('');
        setView('register');
      }}
      onSubmit={(nextEmail, password) => {
        submitAuth('/api/auth/login', nextEmail, password, setLoginError);
      }}
    />
  );
}
