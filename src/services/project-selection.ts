export function recordId(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

export function getSelectedProjectId() {
  return recordId(localStorage.getItem('selectedProjectId'));
}

export function selectProject(value?: number) {
  const next = recordId(value);
  const previous = localStorage.getItem('selectedProjectId');
  if (next) localStorage.setItem('selectedProjectId', String(next));
  else localStorage.removeItem('selectedProjectId');
  if (previous !== (next ? String(next) : null)) {
    window.dispatchEvent(new Event('project:selected'));
  }
}

export function clearWorkspaceSelection() {
  selectProject(undefined);
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('ai:last:') || key.startsWith('ai:drawer:')) localStorage.removeItem(key);
  }
}
