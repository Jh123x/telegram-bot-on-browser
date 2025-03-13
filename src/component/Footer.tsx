import * as React from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import { Box } from "@mui/material";
import styles from "./Footer.module.css";

export const Footer = () => {
  return (
    <Box className={styles.footer} component="footer">
      <Container maxWidth="sm">
        <Typography variant="body2" className={styles.text_box}>
          {"Copyright ©"}
          <Link
            color="inherit"
            href={"https://jh123x.com/"}
            className={styles.url}
          >
            Jh123x
          </Link>
          {new Date().getFullYear()}
        </Typography>
      </Container>
    </Box>
  );
};
