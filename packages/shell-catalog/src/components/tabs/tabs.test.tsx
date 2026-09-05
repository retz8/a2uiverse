import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test} from 'vitest';
import {renderTree} from '../../testing/render';

test('renders on Radix Tabs, the first selected; picking another shows its child', async () => {
  const user = userEvent.setup();
  const {container} = renderTree([
    {
      id: 'root',
      component: 'Tabs',
      tabs: [
        {title: 'First', child: 't1'},
        {title: 'Second', child: 't2'},
      ],
    },
    {id: 't1', component: 'Text', text: 'The first tab'},
    {id: 't2', component: 'Text', text: 'The second tab'},
  ]);
  expect(container.querySelector('.rt-TabsRoot')).not.toBeNull();
  expect(screen.getByRole('tab', {name: /First/})).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByText('The first tab')).toBeInTheDocument();
  expect(screen.queryByText('The second tab')).toBeNull();
  await user.click(screen.getByRole('tab', {name: /Second/}));
  expect(screen.getByText('The second tab')).toBeInTheDocument();
  expect(screen.queryByText('The first tab')).toBeNull();
});
