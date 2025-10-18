import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";


const inter = Inter({subsets: ["latin"] });
const robotoMono = Roboto_Mono({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  return (
    <html lang = "en">
      <body className={`${inter.variable} ${robotoMono.variable} antialiased`}>
        {children}
        </body>
      </html>
  );
}