// Coordinates: attack at the top, own goal at the bottom. Natural player roles stay intact.
function getRoleAtPosition(left, top) {
  const wide = left < 23 || left > 77;
  if (top >= 80 && left >= 35 && left <= 65) return "GO";
  if (top >= 60) return wide ? (left < 50 ? "LE" : "LD") : "ZC";
  if (top >= 50) return wide ? (left < 50 ? "MLE" : "MLD") : "VOL";
  if (top >= 38) return wide ? (left < 50 ? "MLE" : "MLD") : "MLG";
  if (top >= 24) return left <= 25 ? "PTE" : left >= 75 ? "PTD" : "MAT";
  return left <= 25 ? "PTE" : left >= 75 ? "PTD" : "CA";
}
function getTacticsPositions() {
  const defaults =
    formationsDB[gameState.myLineup.formation] || formationsDB["4-4-2"];
  const custom = gameState.myLineup.positions;
  return defaults.map((preset, index) => {
    if (index === 0) return {left:"50%",top:"85%",role:"GO"};
    const saved = custom?.[index];
    const x = Number.parseFloat(saved?.left ?? preset.left);
    const y = Number.parseFloat(saved?.top ?? preset.top);
    const left = Number.isFinite(x)
      ? Math.min(92, Math.max(8, x))
      : parseFloat(preset.left);
    const top = Number.isFinite(y)
      ? Math.min(88, Math.max(10, y))
      : parseFloat(preset.top);
    return {
      left: left + "%",
      top: top + "%",
      role: getRoleAtPosition(left, top) === "GO" ? "ZC" : getRoleAtPosition(left, top),
    };
  });
}
function moveTacticsPlayer(index, left, top) {
  if (
    !Number.isInteger(index) ||
    index <= 0 ||
    index >= 11 ||
    !Number.isFinite(left) ||
    !Number.isFinite(top)
  )
    return;
  const positions = getTacticsPositions();
  positions[index] = {
    left: Math.min(92, Math.max(8, left)) + "%",
    top: Math.min(88, Math.max(10, top)) + "%",
  };
  gameState.myLineup.positions = positions.map((p) => ({
    left: p.left,
    top: p.top,
  }));
  selectedTacticsSlot = "starter-" + index;
  renderClassicHub();
}
function resetTacticsPositions() {
  delete gameState.myLineup.positions;
  renderClassicHub();
}
let tacticsSuppressClickUntil = 0;
function clickTacticsPlayer(event, index) {
  event.stopPropagation();
  if (Date.now() < tacticsSuppressClickUntil) return;
  selectTacticsSlot(index, false);
}
function moveSelectedOnPitch(event) {
  if (
    Date.now() < tacticsSuppressClickUntil ||
    !selectedTacticsSlot?.startsWith("starter-")
  )
    return;
  if (event.target.closest(".pitch-player-avatar")) return;
  const rect = event.currentTarget.getBoundingClientRect();
  moveTacticsPlayer(
    Number(selectedTacticsSlot.split("-")[1]),
    ((event.clientX - rect.left) / rect.width) * 100,
    ((event.clientY - rect.top) / rect.height) * 100,
  );
}
function dragTacticsPlayer(event, index) {
  if (index === 0) return;
  if (event.button !== 0 || !event.isPrimary) return;
  const button = event.currentTarget;
  const slot = button.parentElement;
  const pitch = button.closest(".pitch-container");
  const rect = pitch.getBoundingClientRect();
  const startX = event.clientX,
    startY = event.clientY;
  let moved = false,
    nextX,
    nextY;
  button.setPointerCapture(event.pointerId);
  const move = (e) => {
    if (e.pointerId !== event.pointerId) return;
    if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) < 5)
      return;
    moved = true;
    nextX = Math.min(
      92,
      Math.max(8, ((e.clientX - rect.left) / rect.width) * 100),
    );
    nextY = Math.min(
      88,
      Math.max(10, ((e.clientY - rect.top) / rect.height) * 100),
    );
    slot.style.left = nextX + "%";
    slot.style.top = nextY + "%";
    slot.querySelector(".pitch-slot-role").textContent = getRoleAtPosition(
      nextX,
      nextY,
    );
  };
  const finish = (e) => {
    if (e.pointerId !== event.pointerId) return;
    button.removeEventListener("pointermove", move);
    button.removeEventListener("pointerup", finish);
    button.removeEventListener("pointercancel", finish);
    if (button.hasPointerCapture(event.pointerId))
      button.releasePointerCapture(event.pointerId);
    if (moved) {
      tacticsSuppressClickUntil = Date.now() + 300;
      if (e.type === "pointercancel") renderClassicHub();
      else moveTacticsPlayer(index, nextX, nextY);
    }
  };
  button.addEventListener("pointermove", move);
  button.addEventListener("pointerup", finish);
  button.addEventListener("pointercancel", finish);
}
function keyboardTacticsPlayer(event, index) {
  const deltas = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };
  if (!deltas[event.key]) return;
  event.preventDefault();
  const step = event.shiftKey ? 1 : 3;
  const pos = getTacticsPositions()[index];
  moveTacticsPlayer(
    index,
    parseFloat(pos.left) + deltas[event.key][0] * step,
    parseFloat(pos.top) + deltas[event.key][1] * step,
  );
  document.getElementById("tactics-player-" + index)?.focus();
}
