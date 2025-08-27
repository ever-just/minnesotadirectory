import Select from 'react-select';
import { IndustryOption } from '../lib/types';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onIndustryChange: (industry: string) => void;
  industries: IndustryOption[];
  totalCompanies: number;
}

const SearchBar = ({ onSearch, onIndustryChange, industries, totalCompanies }: SearchBarProps) => {
  // Transform industries for React-Select
  const industryOptions = [
    { value: '', label: 'All Industries - Browse Companies' },
    ...industries.map(industry => ({
      value: industry.value,
      label: industry.label
    }))
  ];

  const handleIndustryChange = (selectedOption: any) => {
    const value = selectedOption ? selectedOption.value : '';
    onIndustryChange(value);
    // Clear any existing search when industry changes
    onSearch('');
  };

  // Custom styles for React-Select
  const customStyles = {
    control: (provided: any) => ({
      ...provided,
      border: 'none',
      outline: 'none',
      boxShadow: 'none',
      background: 'transparent',
      fontSize: '1.125rem',
      fontWeight: '400',
      color: 'var(--text-color)',
      padding: '0.5rem 0',
      cursor: 'pointer',
      minHeight: 'auto',
      '&:hover': {
        border: 'none'
      }
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      padding: '0',
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: 'var(--text-color)',
      margin: '0',
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: '#94a3b8',
      margin: '0',
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    dropdownIndicator: (provided: any) => ({
      ...provided,
      color: '#6b7280',
      padding: '0 0.5rem',
      '&:hover': {
        color: 'var(--primary-color)',
      }
    }),
    menu: (provided: any) => ({
      ...provided,
      borderRadius: '12px',
      boxShadow: '0 12px 35px rgba(0, 0, 0, 0.15)',
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      marginTop: '8px',
      zIndex: 1050, // Explicit z-index control
      isolation: 'isolate', // Prevent interference with other elements
    }),
    menuList: (provided: any) => ({
      ...provided,
      padding: '0',
      maxHeight: '300px',
    }),
    menuPortal: (provided: any) => ({
      ...provided,
      zIndex: 1050, // Ensure portal doesn't interfere
      isolation: 'isolate',
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? 'var(--primary-color)' 
        : state.isFocused 
        ? '#f8fafc' 
        : 'white',
      color: state.isSelected ? 'white' : 'var(--text-color)',
      padding: '12px 16px',
      fontSize: '0.975rem',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: state.isSelected ? 'var(--primary-color)' : '#f1f5f9',
      }
    }),
  };
  
  return (
    <div className="search-container-new">
      <div className="search-input-container">
        <div className="react-select-container">
          <Select
            options={industryOptions}
            onChange={handleIndustryChange}
            placeholder="All Industries - Browse Companies"
            isClearable={false}
            isSearchable={true}
            styles={customStyles}
            className="react-select"
            classNamePrefix="react-select"
            menuPortalTarget={null}
            menuPlacement="bottom"
            menuPosition="absolute"
          />
        </div>
        <div className="search-controls">
          <button className="search-submit" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      <div className="results-count-new">
        {totalCompanies} companies found
      </div>
    </div>
  );
};

export default SearchBar;
