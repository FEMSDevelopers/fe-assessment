import { render, screen, fireEvent, act } from "@testing-library/react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import MQTTTable from "../MQTTTable"; 
import '@testing-library/jest-dom';
import { publishData, unsubscribeFromTopic } from "../../../client";

console.log(unsubscribeFromTopic,publishData);
jest.mock("../../../client", () => {
  return {
    __esModule: true,
    unsubscribeFromTopic: jest.fn(),
    publishData: jest.fn() ,
  };
});



describe("MQTTTable Component", () => {
  const mockStore = configureStore([]);
  let store:any;

  beforeEach(() => {
    store = mockStore({
      mqtt: {
        topics: {
          "device/1/battery": { id: "1", name: "Device 1", values: { time: 31654651, temp: 85, hum: 45 } },
          "device/2/battery": { id: "2", name: "Device 2", values: { time: 31654700, temp: 88, hum: 50 } },
        },
      },
    });
  });

  it("renders the MQTT table with data", () => {
    render(
      <Provider store={store}>
        <MQTTTable isTestEnvironment={true}/>
      </Provider>
    );

    expect(screen.getByText("Device Name")).toBeInTheDocument();
    expect(screen.getByText("Device 1")).toBeInTheDocument();
    expect(screen.getByText("Device 2")).toBeInTheDocument();
    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.getByText("88")).toBeInTheDocument();
  });

  it("opens the publish dialog on button click", async () => {
    render(
      <Provider store={store}>
        <MQTTTable isTestEnvironment={true}/>
      </Provider>
    );
    const publishButtons = await screen.getAllByText("Send Data");
    expect(publishButtons.length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.click(publishButtons[0]);
    });

    expect(screen.getByText("Publish Data")).toBeInTheDocument();
    expect(screen.getByText("Add Value")).toBeInTheDocument();  
    const labelInput = screen.getByTestId("label-input").querySelector('input');
    const valueInput = screen.getByTestId("value-input").querySelector('input');
    if(!labelInput || !valueInput) {
      throw new Error("Could not find label or value input");
    }
    act(() => {
      fireEvent.change(labelInput, { target: { value: 'New Label' } });
      fireEvent.change(valueInput, { target: { value: 'New Value' } });
    });
    const addValueButton = await screen.getByText("Add Value");
    act(() => {
      fireEvent.click(addValueButton);
    });
    expect(screen.getByText("New Label: New Value")).toBeInTheDocument();
    act(() => {
      fireEvent.click(screen.getByTestId("publish-button"));
    });
    expect(publishData).toHaveBeenCalledWith("device/1/battery", [{label: "New Label", value: "New Value"}]);
    // wait for animation
    await new Promise((r) => setTimeout(r, 1000));
    expect(screen.queryByText("Publish Data")).toBeNull();
  });


  it("allows entering a value and publishing it", async () => {
    render(
      <Provider store={store}>
        <MQTTTable />
      </Provider>
    );
    fireEvent.click(screen.getAllByText("Send Data")[0]);
    const labelField = screen.getByTestId("label-input").querySelector('input');
    const valueField = screen.getByTestId("value-input").querySelector('input');
    if(!labelField || !valueField) {
      throw new Error("Could not find input field");
    }
    act(() => {
      fireEvent.change(labelField, { target: { value: "Label Data" } });
      fireEvent.change(valueField, { target: { value: "Value Data" } });
    });

    expect(labelField.value).toBe("Label Data");
    expect(valueField.value).toBe("Value Data");
    act(() => {
      fireEvent.click(screen.getByText("Add Value"));
    });
    expect(screen.getByText("Label Data: Value Data")).toBeInTheDocument();
    act(() => {
      fireEvent.click(screen.getByTestId("publish-button"));
    });
    expect(publishData).toHaveBeenCalledWith("device/1/battery", [{ label: "Label Data", value: "Value Data" }]);
    
  });

  it("calls unsubscribe when clicking the unsubscribe button", async () => {
    render(
      <Provider store={store}>
        <MQTTTable isTestEnvironment={true} />
      </Provider>
    );

    const unsubscribeButtons = screen.getAllByText("Unsubscribe");
    expect(unsubscribeButtons.length).toBeGreaterThan(0);
    // have to skip over the header title
    act(() => {
      fireEvent.click(unsubscribeButtons[1]);
    });
    expect(unsubscribeFromTopic).toHaveBeenCalledWith("device/1/battery");
  });
});