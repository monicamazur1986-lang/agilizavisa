'use client';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription, SheetHeader } from '@/components/ui/sheet';
import { Rocket } from 'lucide-react';
import Image from 'next/image';
import rocketMascot from '@/assets/images/rocket_mascot_1783940800845.jpg';
import { MaterialsList } from './MaterialsList';
import { SimpleCnaeQuery } from './SimpleCnaeQuery';

export function FloatingMaterialsIcon() {
  return (
    <>
      <Sheet>
        <SheetTrigger className="fixed bottom-6 right-6 z-50 bg-white border-2 border-indigo-600 p-2 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center overflow-hidden w-16 h-16">
          <Image 
            src={rocketMascot} 
            alt="Rocket" 
            width={48} 
            height={48} 
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </SheetTrigger>
        <SheetContent className="w-[300px] sm:w-[400px]">
          <SheetHeader>
              <SheetTitle>Materiais para Download</SheetTitle>
              <SheetDescription>Baixe nossos materiais educativos clicando nos links abaixo.</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto h-full mt-6 pb-10">
              <MaterialsList />
              <SimpleCnaeQuery />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
