/**
 * NoteBuns site URLs and launcher paths.
 */
window.NOTEBUNS_CONFIG = {
    externalStoreUrl: '/store',
    launcherWindowsPath: 'downloads/NoteBuns Launcher.exe',
    launcherGithubReleasesUrl: 'https://github.com/milkycloud-dev/melody-launcher-minecraft/releases',
    newsUrl: (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname))
        ? '/api/news'
        : 'news.json'
};
