import React from 'react';

type StatCardProps = {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
};

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-md dark:bg-gray-900 dark:text-white">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h4>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        {icon && <div className="text-3xl">{icon}</div>}
      </div>
    </div>
  );
};
