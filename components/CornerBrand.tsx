'use client';

export default function CornerBrand({dark=false}:{dark?:boolean}){
  return <div className="flex justify-end">
    <img src="/yash-hair-salon-logo.svg" alt="Yash Hair Salon & Academy" className={dark?"h-12 w-40 object-contain object-right":"h-12 w-40 object-contain object-right"} />
  </div>;
}