import express from "express";
import cors from "cors";
import routes from "./routes.js";

const app = express();

app.use(cors());

app.use(express.json());


app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use(routes);

app.listen(3000, () => {
    console.log('API no ar!');
});
