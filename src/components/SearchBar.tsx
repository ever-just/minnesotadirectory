import Select from 'react-select';
import { IndustryOption } from '../lib/types';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onIndustryChange: (industry: string) => void;
  industries: IndustryOption[];
  totalCompanies: number;
}

const SearchBar = ({ onSearch: _onSearch, onIndustryChange, industries, totalCompanies }: SearchBarProps) => {
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
    // Note: Removed onSearch('') call that was causing filter reset bug
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
            isSearchable={false}
            styles={customStyles}
            className="react-select"
            classNamePrefix="react-select"
            menuPortalTarget={null}
            menuPlacement="bottom"
            menuPosition="absolute"
          />
        </div>

      </div>
      <div className="results-count-new">
        {totalCompanies} companies found
      </div>
    </div>
  );
};

export default SearchBar;
