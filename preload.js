var oldAddEventListener = window.addEventListener;
window.addEventListener = (event, func) => {
  if (event != "beforeunload")
    oldAddEventListener(event, func);
}
