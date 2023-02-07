import {
  generateDefaultState,
  renderWithProviders,
  setupStore,
} from "./redux/testUtils";
import App from "./App";

test("renders app correctly", () => {
  const store = setupStore(generateDefaultState());
  const component = renderWithProviders(<App />, { store: store });
  expect(component).toMatchSnapshot();
});
