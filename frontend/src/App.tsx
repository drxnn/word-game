import FAQButton from "./components/FaqButton";
import HomePage from "./components/HomePage";

export default function App() {
  return (
    <div className="bg-gradient-to-br from-violet-50 via-indigo-50 to-slate-100 p-2">
      <FAQButton />
      <HomePage></HomePage>
    </div>
  );
}
