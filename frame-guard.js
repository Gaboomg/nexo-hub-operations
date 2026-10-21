if (window.self !== window.top) {
  document.documentElement.style.visibility = "hidden";
  try {
    window.top.location.href = window.location.href;
  } catch {}
}
