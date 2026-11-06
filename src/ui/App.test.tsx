import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('simulator headings', () => {
  it('omits decorative eyebrow text while keeping headings and units', () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).not.toContain('THE CPU, EXPLAINED');
    expect(markup).not.toContain('HOW IT WORKS');
    expect(markup).toContain('Every process.');
    expect(markup).toContain('First come, first served');
    expect(markup).toContain('TIME UNITS');
  });

  it('keeps the intro heading without supporting promotional text', () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup.includes('Explore scheduling algorithms')).toBe(false);
    expect(markup.includes('Interactive workspace')).toBe(false);
    expect(markup.includes('Edit a value. Watch the schedule change.')).toBe(false);
    expect(markup).toContain('<h1>Every process.<br class="mobile-break"/> In its own time.</h1>');
  });

  it('omits the auto-update label and dot while keeping the algorithm explanation', () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup.includes('Calculates as you edit')).toBe(false);
    expect(markup.includes('class="auto-update"')).toBe(false);
    expect(markup).toContain('Processes run in arrival order. Once a process starts, it runs to completion.');
  });

  it('omits the header subtitle and divider', () => {
    const markup = renderToStaticMarkup(<App />);
    const header = markup.match(/<header\b[^>]*>[\s\S]*?<\/header>/)?.[0];

    expect(header).toBeDefined();
    expect(header?.includes('Scheduling lab')).toBe(false);
    expect(header?.includes('class="brand-divider"')).toBe(false);
    expect(header).toContain('Dispatch simulator');
  });

  it('shows valid results without the simulation-ready label or status dot', () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup.includes('Simulation ready')).toBe(false);
    expect(markup.includes('class="result-status"')).toBe(false);
    expect(markup).toContain('Read the schedule');
    expect(markup).toContain('Process breakdown');
  });

  it('keeps footer branding and the course code without the tagline or lab subtitle', () => {
    const markup = renderToStaticMarkup(<App />);
    const footer = markup.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/)?.[0];

    expect(footer).toBeDefined();
    expect(footer?.includes('A little clarity for your CPU.')).toBe(false);
    expect(footer?.includes('Scheduling lab')).toBe(false);
    expect(footer?.includes('<span>/</span>')).toBe(false);
    expect(footer?.includes('·')).toBe(false);
    expect(footer).toContain('dispatch');
    expect(footer).toContain('CS 3104N');
  });
});
