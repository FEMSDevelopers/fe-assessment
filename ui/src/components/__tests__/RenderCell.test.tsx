// import React from 'react';
import { render, screen } from '@testing-library/react';
import { DataGrid, GridColDef, GridRowsProp } from '@mui/x-data-grid';
import '@testing-library/jest-dom'

// probing renderCell because it is causing many issues.

const columns: GridColDef[] = [
  {
    field: 'name',
    headerName: 'Name',
    renderCell: (params) => <span data-testid="name-cell">{params.value}</span>,
  },
  { field: 'age', headerName: 'Age' },
];

const rows: GridRowsProp = [
  { id: 2, name: 'Jane Smith', age: 25 },
];

const TestDataGrid = () => {
  return (
    <div style={{ height: 300, width: '100%' }}>
      <DataGrid rows={rows} columns={columns} />
    </div>
  );
};

describe('DataGrid renderCell', () => {
  it('should render the name cell with the correct value', () => {
    render(<TestDataGrid />);
    const nameCell = screen.getByTestId('name-cell');
    expect(nameCell).toBeInTheDocument();
    expect(nameCell).toHaveTextContent('Jane Smith');
  });
});