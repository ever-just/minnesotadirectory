import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface HeroSectionProps {
  totalCompanies: number;
}

const HeroSection: React.FC<HeroSectionProps> = ({ totalCompanies }) => {
  return (
    <section className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 mb-8 rounded-xl overflow-hidden shadow-sm">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-indigo-600/5 to-purple-600/5"></div>
      <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64 bg-blue-500/10 rounded-full -translate-y-16 sm:-translate-y-24 lg:-translate-y-32 translate-x-16 sm:translate-x-24 lg:translate-x-32"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-36 sm:h-36 lg:w-48 lg:h-48 bg-indigo-500/10 rounded-full translate-y-12 sm:translate-y-18 lg:translate-y-24 -translate-x-12 sm:-translate-x-18 lg:-translate-x-24"></div>
      <div className="absolute top-1/2 left-1/4 w-16 h-16 sm:w-20 sm:h-20 bg-purple-500/5 rounded-full -translate-y-1/2"></div>
      
      <div className="relative max-w-5xl mx-auto text-center">
        {/* Main heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-4 sm:mb-6 lg:mb-8 leading-tight tracking-tight">
          Discover Minnesota's
          <span className="block text-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Leading Companies
          </span>
        </h1>
        
        {/* Descriptive text */}
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 mb-6 sm:mb-8 lg:mb-10 max-w-4xl mx-auto leading-relaxed px-2 sm:px-4">
          Explore a comprehensive directory of Minnesota's most successful businesses. 
          From Fortune 500 corporations to innovative startups, find companies with 
          <span className="font-semibold text-blue-700">$10M+ in revenue</span> and 
          <span className="font-semibold text-blue-700">10+ employees</span> driving the state's economy forward.
        </p>
        
        {/* Statistics cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10 lg:mb-12 max-w-4xl mx-auto px-2 sm:px-4">
          <Card className="bg-white/90 backdrop-blur-md border-blue-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-white/95">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-600 mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {totalCompanies.toLocaleString()}+
              </div>
              <div className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">
                Companies Listed
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/90 backdrop-blur-md border-blue-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-white/95">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-600 mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                $10M+
              </div>
              <div className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">
                Minimum Revenue
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/90 backdrop-blur-md border-blue-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-white/95 sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-600 mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                10+
              </div>
              <div className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">
                Minimum Employees
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Call to action */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-6 justify-center items-center mb-6 sm:mb-8">
          <Button 
            size="lg" 
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 sm:px-8 lg:px-10 py-3 sm:py-4 text-base sm:text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 rounded-lg"
          >
            Explore Companies
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            className="w-full sm:w-auto border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-6 sm:px-8 lg:px-10 py-3 sm:py-4 text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-lg"
          >
            Learn More
          </Button>
        </div>
        
        {/* Additional info */}
        <div className="mt-6 sm:mt-8 lg:mt-10 px-4 sm:px-6">
          <p className="text-xs sm:text-sm lg:text-base text-gray-500 leading-relaxed max-w-3xl mx-auto">
            Featuring companies across diverse industries including 
            <span className="font-medium text-gray-600"> technology</span>, 
            <span className="font-medium text-gray-600"> healthcare</span>, 
            <span className="font-medium text-gray-600"> manufacturing</span>, 
            <span className="font-medium text-gray-600"> retail</span>, and 
            <span className="font-medium text-gray-600"> financial services</span>
          </p>
          
          {/* Subtle divider */}
          <div className="mt-6 sm:mt-8 flex justify-center">
            <div className="w-16 sm:w-24 h-0.5 bg-gradient-to-r from-transparent via-blue-300 to-transparent"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;




