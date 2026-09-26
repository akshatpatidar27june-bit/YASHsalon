import './globals.css';
import {BrandExperience} from '../components/BrandExperience';

export const metadata={title:'Yash Hair Salon & Academy',description:'Yash Hair Salon & Academy operations system'};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>
    <BrandExperience/>
    {children}
  </body></html>
}
