# Tournament Manager

A responsive, mobile-first web app for managing Round Robin tournaments. Built with pure HTML, CSS, and JavaScript.

## Features

- **Mobile-First Design**: Optimized for phones with large touch targets and sticky headers.
- **Round Robin Scheduling**: Supports multiple cycles and shuffling.
- **Live Standings**: Automatically calculates Wins, Point Differential, and more.
- **Flexible Rules**: Configurable "Games To", "Win by 2", and Tie rules.
- **Persistence**: Autosaves to browser storage; never lose your data.
- **Dark Mode**: Toggle between light and dark themes.
- **Export/Import**: Save tournament data to JSON and load it later.

## Deployment to GitHub Pages

Follow these steps to deploy this app to the web for free.

### Prerequisites
- A GitHub account.
- Terminal access.
- [GitHub CLI (gh)](https://cli.github.com/) installed (Recommended).

### Step-by-Step Instructions

1.  **Initialize Git Repository**
    ```bash
    git init
    git add .
    git commit -m "Initial commit: Tournament App"
    ```

2.  **Create GitHub Repository**
    *Using GitHub CLI:*
    ```bash
    gh repo create tournament-app --public --source=. --remote=origin
    ```
    *Or manually:*
    - Go to [github.com/new](https://github.com/new).
    - Name it `tournament-app`.
    - Run: `git remote add origin https://github.com/YOUR_USERNAME/tournament-app.git`

3.  **Push Code**
    ```bash
    git branch -M main
    git push -u origin main
    ```

4.  **Enable GitHub Pages**
    *Using GitHub CLI:*
    ```bash
    gh repo edit --enable-pages --source-branch main --source-path /
    ```
    *Or manually:*
    - Go to your repository Settings > Pages.
    - Under "Source", select `main` branch and `/ (root)` folder.
    - Click Save.

5.  **Access Your App**
    Your app will be live at:
    `https://YOUR_USERNAME.github.io/tournament-app/`
