import React, {useReducer} from "react";
import { useSelector } from "react-redux";
import { DataGrid } from "@mui/x-data-grid";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { publishData, unsubscribeFromTopic } from "../../client";

const reducer = (state:any[], action:any) => {
    switch (action.type) {
        case "DELETE":
            return [...state.filter(({label}) => label !== action.payload)];
        case "SET_NEW_PAIR":
            if(!state.some((pair) => pair.label === action.payload.label)) {
                return [...state, { label: action.payload.label, value: action.payload.value }];
            }
            return state.map((pair) => {
                if(pair.label === action.payload.label) {
                    return { label: action.payload.label, value: action.payload.value };
                }
                return pair;
            });
        case "RESET":
            return [];
        default:
            return state;
    }

};


const MQTTTable = ({isTestEnvironment=false}:{isTestEnvironment?:boolean}) => {
  const { topics } = useSelector((state:any) => state.mqtt);
  const [open, setOpen] = React.useState(false);
  const [label, setLabel] = React.useState("");
  const [value, setValue] = React.useState("");
  const [selectedTopic, setSelectedTopic] = React.useState("");
  const [inputValues, setInputValue] = useReducer(reducer, []);

  const handlePublish = () => {
    publishData(selectedTopic, inputValues);
    setOpen(false);
  };

  const emptyArray:any[] = [];

  const columns = [
    { field: "id", headerName: "ID", width: 10 },
    { field: "name", headerName: "Device Name", width: 100 },
    ...Object.keys(topics)
      .flatMap((topic) => Object.keys(topics[topic].values))
      .map((prop) => ({
        field: prop,
        headerName: prop.charAt(0).toUpperCase() + prop.slice(1),
        width: 90,
      })).reduce((acc, curr) => {
        if (!acc.some((col) => col.field === curr.field)) {
          acc.push(curr);
        }
        return acc;
      }, emptyArray),
    {
      field: "publish",
      headerName: "Publish",
      renderCell: (params:any) => (
        <Button
          variant="contained"
          onClick={() => {
            setSelectedTopic(params.row.topic);
            setOpen(true);
          }}
        >
          Send Data
        </Button>
      ),
      width: 120,
    },
    {
      field: "unsubscribe",
      headerName: "Unsubscribe",
      renderCell: (params:any) => (
        <Button
          variant="contained"
          color="secondary"
          onClick={() => unsubscribeFromTopic(params.row.topic)}
        >
          Unsubscribe
        </Button>
      ),
      width: 120,
    },
  ];

  const rows = Object.keys(topics).map((topic) => ({
    id: topics[topic].id,
    name: topics[topic].name,
    topic,
    ...topics[topic].values,
  }));

  return (
    <>
      <DataGrid 
        rows={rows} 
        columns={columns} 
        sx={{display:'grid'}} 
        disableVirtualization={isTestEnvironment ? true : undefined}
        onProcessRowUpdateError={isTestEnvironment ? () => {} : undefined}

        />
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Publish Data</DialogTitle>
        <DialogContent>
            {inputValues.map(({value, label}, index) => (
                <div key={index}>
                    {label}: {value} <Button onClick={() => setInputValue({ type: "DELETE", payload: label})}>remove</Button>
                </div>
            ))}

            <div>
                <TextField
                    value={label}
                    margin="normal"
                    onChange={(value) => setLabel(value.target.value)}
                    label="Label"
                    data-testid="label-input"
                />: 
                <TextField
                    value={value}
                    onChange={(value) => setValue(value.target.value)}
                    label="Value"
                    margin="normal"
                    data-testid="value-input"
                />
                <br />
                <Button
                    onClick={() => setInputValue({ type: "SET_NEW_PAIR", payload: { label, value} })}
                    variant="contained"
                    color="primary"
                    style={{ marginTop: "10px" }}
                >
                    Add Value
                </Button> 
                <Button onClick={() => setInputValue({ type: "RESET" })}
                 variant="contained" 
                color="secondary" style={{ marginTop: "10px", marginLeft: "10px" }}>
                    Reset
                </Button>
            </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handlePublish} 
            variant="contained"
            data-testid="publish-button"
          >
            Publish
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MQTTTable;