import React from 'react';
import DriverListTable from '../components/driver-list-table';
import { useDriverStore } from '../store/driver-store';

/**
 * Main driver list page showing table of all known drivers
 */
const DriverListPage: React.FC = () => {
  const drivers = useDriverStore((state) => state.drivers);

  return <DriverListTable drivers={drivers} />;
};

export default DriverListPage;
