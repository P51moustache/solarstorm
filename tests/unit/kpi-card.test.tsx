import { render } from '@testing-library/react-native';
import React from 'react';
import { KpiCard } from '../../components/KpiCard';

describe('KpiCard Component', () => {
  it('renders correctly with basic props', () => {
    const { getByText } = render(
      <KpiCard
        label="Test Label"
        value={123}
        unit="km/s"
      />
    );

    expect(getByText('Test Label')).toBeTruthy();
    expect(getByText('123')).toBeTruthy();
    expect(getByText('km/s')).toBeTruthy();
  });

  it('renders null value as dashes', () => {
    const { getByText } = render(
      <KpiCard
        label="Test Label"
        value={null}
      />
    );

    expect(getByText('--')).toBeTruthy();
  });

  it('renders with subtitle when provided', () => {
    const { getByText } = render(
      <KpiCard
        label="Test Label"
        value={123}
        subtitle="Test Subtitle"
      />
    );

    expect(getByText('Test Subtitle')).toBeTruthy();
  });
});
