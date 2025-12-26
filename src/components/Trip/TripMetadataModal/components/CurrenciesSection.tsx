import React from 'react';
import { CurrencySelector } from '../../../ui';
import { colors } from '../../../../styles/theme';
import type { CurrenciesSectionProps } from '../types';

const CurrenciesSection: React.FC<CurrenciesSectionProps> = ({
  currencies,
  onChange
}) => {
  return (
    <div className="space-y-3">
      <label
        className="block text-sm font-semibold"
        style={{ color: colors.textMuted }}
      >
        Valute del viaggio
      </label>

      <CurrencySelector
        preferredCurrencies={currencies}
        onChange={onChange}
      />
    </div>
  );
};

export default CurrenciesSection;
