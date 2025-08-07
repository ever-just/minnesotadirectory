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
      
      <div className="relative max-w-4xl mx-auto text-center">
        {/* Main heading */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Discover Minnesota's
          <span className="block text-blue-600">Leading Companies</span>
        </h1>
        
        {/* Descriptive text */}
        <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
          Explore a comprehensive directory of Minnesota's most successful businesses. 
          From Fortune 500 corporations to innovative startups, find companies with 
          $10M+ in revenue and 10+ employees driving the state's economy forward.
        </p>
        
        {/* Statistics cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-2xl mx-auto">
          <Card className="bg-white/80 backdrop-blur-sm border-blue-200 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {totalCompanies.toLocaleString()}+
              </div>
              <div className="text-sm font-medium text-gray-600">
                Companies Listed
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-blue-200 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                $10M+
              </div>
              <div className="text-sm font-medium text-gray-600">
                Minimum Revenue
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-blue-200 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                10+
              </div>
              <div className="text-sm font-medium text-gray-600">
                Minimum Employees
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Call to action */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            size="lg" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-semibold shadow-lg"
          >
            Explore Companies
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            className="border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 text-lg font-semibold"
          >
            Learn More
          </Button>
        </div>
        
        {/* Additional info */}
        <div className="mt-8 text-sm text-gray-500">
          <p>
            Featuring companies across diverse industries including technology, healthcare, 
            manufacturing, retail, and financial services
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

