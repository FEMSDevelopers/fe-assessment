import React from "react";
import { useSelector } from "react-redux";
import { DataGrid } from "@mui/x-data-grid";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { publishData, unsubscribeFromTopic } from "../../client";

const MQTTTable = () => {
  const { topics } = useSelector((state:any) => state.mqtt);
  const [open, setOpen] = React.useState(false);
  const [selectedTopic, setSelectedTopic] = React.useState("");
  const [inputValue, setInputValue] = React.useState("");

  const handlePublish = () => {
    publishData(selectedTopic, { value: inputValue });
    setOpen(false);
  };

  const emptyArray:any[] = [];

  const columns = [
    { field: "id", headerName: "ID", width: 100 },
    { field: "name", headerName: "Device Name", width: 150 },
    ...Object.keys(topics)
      .flatMap((topic) => Object.keys(topics[topic].values))
      .map((prop) => ({
        field: prop,
        headerName: prop.charAt(0).toUpperCase() + prop.slice(1),
        width: 120,
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
      <DataGrid rows={rows} columns={columns} autoHeight />
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Publish Data</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Value"
            fullWidth
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handlePublish} variant="contained">
            Publish
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MQTTTable;