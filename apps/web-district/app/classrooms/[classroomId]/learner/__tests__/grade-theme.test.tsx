import { GradeThemeProvider } from '@aivo/ui-web';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { gradeToBand } from '../../../../../lib/grade-band.js';

function TestComponent({ grade }: { grade: number }) {
  const band = gradeToBand(grade);
  return (
    <GradeThemeProvider initialGrade={band}>
      <div data-testid="band">{band}</div>
    </GradeThemeProvider>
  );
}

describe('grade theme selection', () => {
  it('sets K5 theme for grade 3 learners', async () => {
    render(<TestComponent grade={3} />);
    await waitFor(() => {
      expect(document.documentElement.dataset.gradeTheme).toBe('K5');
    });
  });
});
