import { TextField, Button, FormGroup, Typography } from "@mui/material";
import { setToken } from "../redux/botSlice";
import { useDispatch, useSelector } from "react-redux";

export const TokenSaver = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.bot.token);

  return (
    <FormGroup>
      <Typography>
        Please enter your API token to save it to local storage.
      </Typography>
      <TextField
        label="API Token"
        value={token}
        onChange={(e) => dispatch(setToken(e.target.value))}
      />
      <Button
        variant="contained"
        onClick={() => {
          localStorage.setItem("token", token);
        }}
      >
        Save
      </Button>
    </FormGroup>
  );
};
