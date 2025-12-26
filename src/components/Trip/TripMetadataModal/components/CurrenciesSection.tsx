import React from 'react';
import { CurrencySelector } from '../../../ui';
import { colors } from '../../../../styles/theme';
import type { CurrenciesSectionProps } from '../types';

const CurrenciesSection: React.FC<CurrenciesSectionProps> = ({
  currencies,
  onChange
}) => {
  return (
    <div
      className="w-full rounded-2xl"
      style={{
        backgroundColor: colors.bgSubtle
      }}
    >
      <div className="px-4 py-3">
        <span
          className="block text-base font-semibold mb-3"
          style={{ color: colors.text }}
        >
          Quali valute?
        </span>
        <CurrencySelector
          preferredCurrencies={currencies}
          onChange={onChange}
        />
      </div>
    </div>
  );
};

export default CurrenciesSection;
