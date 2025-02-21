import React from "react";
import { render, screen } from "@testing-library/react";
import '@testing-library/jest-dom';
import Button from "../Button";

import userEvent from '@testing-library/user-event';

describe('Button', () => {
  it('should render', () => {
    const text = 'Hello World!';
    const params = {row:{topic:"device/1/battery", value: "42"}};
    render(<Button params={params}>{text}</Button>);
    expect(screen.getByText('Hello World!')).toBeInTheDocument();
  });

  it('should be clickable', () => {
    const text = 'Hello World!';
    const testFunction = jest.fn();
    const params = {row:{topic:"device/1/battery", value: "42"}};
    render(<Button params={params} onClick={() => testFunction()}>{text}</Button>);
    userEvent.click(screen.getByText('Hello World!'));
    expect(testFunction).toHaveBeenCalledTimes(1);
  });

});