// Playwright CLI run-code snippet; begin on /dashboard with an isolated guest.
// Uses the real app; does not submit attempts or change profile/group data.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async (page) => {
  const assert = (value, message) => { if (!value) throw new Error(message); };
  await page.getByRole('heading', { name: 'Python', exact: true }).waitFor();
  const cards = page.getByRole('main').getByRole('article');
  assert(await cards.count() === 3, 'All three actual courses are visible');
  for (const [category, title] of [['Programming', 'Python'], ['AI', 'How to use AI'], ['Languages', 'Spanish']]) {
    const filter = page.getByRole('button', { name: category, exact: true });
    await filter.click();
    await page.getByRole('heading', { name: title, exact: true }).waitFor();
    assert(await filter.getAttribute('aria-pressed') === 'true', 'Active filter is announced');
    assert(await cards.count() === 1, 'Filter shows exactly its course');
  }
  await page.getByRole('button', { name: 'All courses', exact: true }).click();
  await page.getByRole('link', { name: /Write your first useful function/ }).first().click();
  const editor = page.getByRole('textbox', { name: 'Your Python code' });
  await editor.waitFor();
  const original = await editor.inputValue();
  const draft = '# UI navigation check\n' + original;
  await editor.fill(draft);
  await page.getByRole('navigation', { name: 'In this lesson' }).getByRole('link', { name: /Knowledge check/ }).click();
  assert(await editor.inputValue() === draft, 'Section navigation preserves the Python draft');
  await editor.fill(original);
  const viewport = page.viewportSize();
  try {
    await page.setViewportSize({ width: 320, height: 800 });
    assert(await page.getByRole('link', { name: 'Your profile', exact: true }).isVisible(), 'Mobile profile remains named and visible');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'No page-level horizontal overflow');
  } finally {
    if (viewport) await page.setViewportSize(viewport);
  }
  return ['Course filters PASS', 'Python draft preserved PASS', 'Mobile navigation and overflow PASS'];
}
