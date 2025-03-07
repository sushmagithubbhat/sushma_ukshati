import React, { useState, useEffect } from 'react';
//import { jsPDF } from 'jspdf';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';



const QuoteManager = () => {
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [categories, setCategories] = useState([]);
  const [itemsByCategory, setItemsByCategory] = useState({});
  const [selectedItems, setSelectedItems] = useState({});
  const [additionalCost, setAdditionalCost] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [searchFilters, setSearchFilters] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [generatedQuote, setGeneratedQuote] = useState(null);

  // Fetch projects on initial load
  useEffect(() => {
    fetch('/api/projects')
      .then((response) => response.json())
      .then((data) => setProjects(data))
      .catch((err) => console.error('Error fetching projects:', err));
  }, []);

  // Fetch customer and categories when projectId is selected
  useEffect(() => {
    if (projectId) {
      setIsLoading(true);
      Promise.all([
        fetch(`/api/customer/${projectId}`).then((res) => res.json()),
        fetch('/api/categories').then((res) => res.json()),
      ])
        .then(([customerRes, categoriesRes]) => {
          setCustomer(customerRes);
          setCategories(categoriesRes);
        })
        .catch((err) => console.error('Error fetching data:', err))
        .finally(() => setIsLoading(false));
    }
  }, [projectId]);

  // Fetch items for each category
  useEffect(() => {
    if (categories.length > 0) {
      categories.forEach((category) => {
        fetch(`/api/items/${category.category_id}`)
          .then((res) => res.json())
          .then((data) => {
            setItemsByCategory((prev) => ({
              ...prev,
              [category.category_id]: data,
            }));
          })
          .catch((err) =>
            console.error(`Error fetching items for category ${category.category_name}:`, err)
          );
      });
    }
  }, [categories]);

  // Calculate the total cost whenever selectedItems or additionalCost changes
  useEffect(() => {
    const selectedCosts = {
      Drip: 0,
      Plumbing: 0,
      Automation: 0,
      Labour: 0,
    };

    Object.entries(selectedItems).forEach(([categoryId, items]) => {
      items.forEach((item) => {
        const categoryName = categories.find(
          (cat) => cat.category_id === parseInt(categoryId)
        )?.category_name;
        if (categoryName && selectedCosts.hasOwnProperty(categoryName)) {
          selectedCosts[categoryName] += item.cost * item.quantity;
        }
      });
    });

    const total = Object.values(selectedCosts).reduce((acc, cost) => acc + (cost || 0), 0) + parseFloat(additionalCost || 0);
    setTotalCost(total);
  }, [selectedItems, additionalCost, categories]);

  // Handle item selection
  const handleItemSelection = (categoryId, item_id, cost) => {
    setSelectedItems((prev) => {
      const categoryItems = prev[categoryId] || [];
      if (categoryItems.some((item) => item.item_id === item_id)) {
        return {
          ...prev,
          [categoryId]: categoryItems.filter((item) => item.item_id !== item_id),
        };
      } else {
        return {
          ...prev,
          [categoryId]: [
            ...categoryItems,
            { item_id, cost: parseFloat(cost), quantity: 1 },
          ],
        };
      }
    });
  };

  // Handle quantity change for an item
  const handleQuantityChange = (categoryId, item_id, quantity) => {
    setSelectedItems((prev) => {
      const categoryItems = prev[categoryId] || [];
      const updatedItems = categoryItems.map((item) =>
        item.item_id === item_id ? { ...item, quantity: parseInt(quantity) } : item
      );
      return {
        ...prev,
        [categoryId]: updatedItems,
      };
    });
  };

  // Fetch last quote ID and increment it for new quote
  const fetchLastQuoteId = async () => {
    try {
      const res = await fetch('/api/last-quote-id');
      const data = await res.json();
      return data.nextQuoteId;
    } catch (err) {
      console.error('Error fetching last quote ID:', err);
      return null; // Handle the error gracefully
    }
  };

  // Generate PDF of the quote
  const generateQuote = async () => {
    const quoteId = await fetchLastQuoteId(); // Get the next quote ID
  const doc = new jsPDF();

  doc.setDrawColor(0, 128, 0); // Green color
doc.setLineWidth(3);
doc.line(20, 5, 190, 5);  
  const logo = 'data:image/jpeg;base64,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';

  // Add Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Ukshati Technologies', 20, 25);

  doc.addImage(logo, 'JPEG', 150, 10, 30, 30);

  // Add Company Details below the title
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('Pvt. Ltd.', 20, 35);
  doc.text('2nd floor, Pramod Automobiles bldg.', 20, 43);
  doc.text('Karangalpady', 20, 51);
  doc.text('Mangalore - 575003', 20, 59);
  doc.text('Karnataka', 20, 67);
  doc.text('Phone: + 91 8861567365', 20, 75);
  doc.textWithLink('www.ukshati.com', 20, 83, { url: 'http://www.ukshati.com' });

  // Draw a thin dark blue line below the address (left side)
  doc.setDrawColor(0, 0, 139); // Dark blue (RGB: 0,0,139)
  doc.setLineWidth(1);
  doc.line(20, 88, 100, 88);

  // Add Quote ID and Customer Info below the line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Quote ID: ${quoteId}`, 20, 100);
  doc.text(`Customer: ${customer?.customer_name}`, 20, 108);
  doc.text(`Address: ${customer?.address}`, 20, 116);

  // Add Logo at the top-right

  // Set starting Y for the cost breakdown table
  let startY = 125;

  // Prepare table rows for cost breakdown per category
  const tableRows = categories.map((category) => {
    const categoryTotal = selectedItems[category.category_id]?.reduce(
      (sum, item) => sum + item.cost * item.quantity,
      0
    ) || 0;
    return [category.category_name, `$${categoryTotal.toFixed(2)}`];
  });

  // Generate cost breakdown table using AutoTable
  doc.autoTable({
    head: [['Category', 'Cost']],
    body: tableRows,
    startY: startY,
    theme: 'grid',
    headStyles: { fillColor: [0, 128, 0], halign: 'center' },
    styles: { fontSize: 12, halign: 'center' },
  });

  // Get final Y position after the table
  const finalY = doc.lastAutoTable.finalY + 5; // Reduced spacing

  // Add Additional Cost and Total Cost summary side by side
  doc.setFont('helvetica', 'bold');
  doc.text('Additional Cost:', 20, finalY);
  doc.text(`$${parseFloat(additionalCost).toFixed(2)}`, 80, finalY);
  doc.text('Total Cost:', 120, finalY);
  doc.text(`$${totalCost.toFixed(2)}`, 170, finalY);

  const bottomY = finalY + 10;
  
  // Left side: QR code image (scanner image). Replace with your actual Base64 string.
  const qrCode = 'data:image/jpeg;base64,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';
  doc.addImage(qrCode, 'PNG', 20, bottomY, 40, 40);
  const bankXOffset = 45;  // Change this value to shift more to the right
  const bankX = 80 + bankXOffset; // Current starting x for bank details plus offset
  const bankYOffset = 5; // Vertical offset from the top of the QR code
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Bank Details:-', bankX, bottomY + bankYOffset);
  doc.text('ICICI Bank', bankX, bottomY + bankYOffset + 6);
  doc.text('Name:- Ukshati Technologies Private Limited', bankX, bottomY + bankYOffset + 12);
  doc.text('Account Number - XXXXXXXXXXXXXXX', bankX, bottomY + bankYOffset + 18);
  doc.text('IFSC Code - XXXXXXXX', bankX, bottomY + bankYOffset + 24);
  // Right side: Bank Details and Special Notes

  
  // Move Special Notes to further right (e.g., x = 200)
  const greenLineY = bottomY + 45; // 5 units below the QR code (which is 40px tall)
  doc.setDrawColor(0, 128, 0); // Green color (RGB: 0,128,0)
  doc.setLineWidth(3);       // Thick line
  doc.line(20, greenLineY, 190, greenLineY);  // Draw line from x=20 to x=190
  
  // 3. Add Special Notes below the green line (starting a little further down)
  const specialNotesY = greenLineY + 10; // 10 units below the green line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Special Notes:', 20, specialNotesY);
  doc.text('Two-year warranty included.', 20, specialNotesY + 6);
  doc.text('SIM card not included in the package.', 20, specialNotesY + 12);
  doc.text('Payment terms: 70% advance, 30% after installation.', 20, specialNotesY + 18);
  doc.text('Extra work charged separately.', 20, specialNotesY + 24);
  doc.text('Wi-Fi extender extra if signal weak.', 20, specialNotesY + 30);
  doc.text('Quote validity: 6 months from date of issue.', 20, specialNotesY + 36);

  // Store PDF as base64 and display it
  const pdfData = doc.output('dataurlstring');
  setGeneratedQuote(pdfData);

  // Optionally, save the PDF
  doc.save('generated-quote.pdf');
    
  };

  // Save quote to the backend
  const saveQuote = () => {
    const categoryCosts = categories.reduce((acc, category) => {
      const items = selectedItems[category.category_id] || [];
      acc[`${category.category_name.toLowerCase()}_cost`] = items.reduce((sum, item) => sum + item.cost * item.quantity, 0);
      return acc;
    }, {});

    fetch('/api/save-quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        customer_name: customer?.customer_name,
        ...categoryCosts,
        additional_cost: parseFloat(additionalCost),
        total_cost: totalCost,
      }),
    })
      .then((res) => res.json())
      .then((data) => console.log('Quote saved:', data))
      .catch((err) => console.error('Error saving quote:', err));
  };

  // Handle search filter for items
  const handleSearchChange = (categoryId, value) => {
    setSearchFilters((prev) => ({
      ...prev,
      [categoryId]: value,
    }));
  };
  const getFilteredItems = (categoryId) => {
    const filter = searchFilters[categoryId]?.toLowerCase() || '';
    const items = itemsByCategory[categoryId] || [];
    if (!filter) {
      return [];
    }
    return items.filter((item) =>
      item.item_name.toLowerCase().includes(filter)
    );
  };

  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: 'white',
        color: 'black',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        maxWidth: '800px',
        margin: '20px auto',
      }}
    >
      <h1 style={{ marginBottom: '20px', color: '#007bff' }}>Quote Management</h1>
      {/* Select Project */}
      <label style={{ fontWeight: 'bold', marginBottom: '5px' }}>Select Project ID:</label>
      <select
        onChange={(e) => setProjectId(e.target.value)}
        value={projectId}
        style={{
          padding: '8px',
          margin: '10px 0 20px 0',
          borderRadius: '4px',
          border: '1px solid #ccc',
          fontSize: '16px',
          width: '250px',
        }}
      >
        <option value=''>-- Select Project --</option>
        {projects.map((proj) => (
          <option key={proj.pid} value={proj.pid}>
            {proj.pid}
          </option>
        ))}
      </select>

      {/* Customer Details */}
      {customer && (
        <p style={{ marginBottom: '20px' }}>
          <strong>Customer:</strong> {customer.customer_name}, <strong>Address:</strong> {customer.address}
        </p>
      )}

      {/* Categories and Items */}
      {categories.map((cat) => (
        <div key={cat.category_id} style={{ marginBottom: '20px', width: '100%' }}>
          <h3 style={{ marginBottom: '10px', color: '#0056b3' }}>{cat.category_name}</h3>
          <input
            type='text'
            placeholder={`Search items in ${cat.category_name}`}
            value={searchFilters[cat.category_id] || ''}
            onChange={(e) => handleSearchChange(cat.category_id, e.target.value)}
            style={{
              padding: '8px',
              marginBottom: '10px',
              width: '100%',
              borderRadius: '4px',
              border: '1px solid #ccc',
              fontSize: '16px',
            }}
          />
          {getFilteredItems(cat.category_id)?.map((item) => (
            <div key={item.item_id} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
              <input
                type='checkbox'
                id={`item-${item.item_id}`}
                onChange={() => handleItemSelection(cat.category_id, item.item_id, item.price_pu)}
                checked={selectedItems[cat.category_id]?.some((i) => i.item_id === item.item_id) || false}
                style={{ width: '16px', height: '16px' }}
              />
              <label htmlFor={`item-${item.item_id}`} style={{ marginLeft: '10px', fontSize: '16px' }}>
                {item.item_name} (${item.price_pu})
              </label>
              {selectedItems[cat.category_id]?.some((i) => i.item_id === item.item_id) && (
                <div style={{ marginLeft: '10px', display: 'flex', alignItems: 'center' }}>
                  <input
                    type='number'
                    value={(selectedItems[cat.category_id]?.find((i) => i.item_id === item.item_id)?.quantity || 1)}
                    onChange={(e) => handleQuantityChange(cat.category_id, item.item_id, e.target.value)}
                    min='1'
                    style={{
                      width: '60px',
                      padding: '5px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                    }}
                  />
                  <span style={{ marginLeft: '10px', fontSize: '16px' }}>
                    Total: $ {((selectedItems[cat.category_id]?.find((i) => i.item_id === item.item_id)?.quantity || 1) * item.price_pu).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Additional Cost */}
      {projectId && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Additional Cost ($):</label>
          <input
            type='number'
            value={additionalCost}
            onChange={(e) => setAdditionalCost(e.target.value)}
            placeholder='Enter additional cost'
            style={{
              padding: '8px',
              width: '120px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              fontSize: '16px',
            }}
          />
        </div>
      )}

      {projectId && (
        <h2 style={{ color: 'blue', marginTop: '10px', marginBottom: '20px' }}>
          Total Cost: ${totalCost.toFixed(2)}
        </h2>
      )}

      {/* Generate and Save Quote Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '20px',
        }}
      >
        <button
          onClick={generateQuote}
          disabled={!projectId || !totalCost}
          style={{
            backgroundColor: (!projectId || !totalCost) ? '#a1d99b' : '#28a745',
            color: '#fff',
            padding: '12px 20px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: (!projectId || !totalCost) ? 'not-allowed' : 'pointer',
            marginRight: '10px',
            transition: 'background-color 0.3s ease-in-out',
          }}
        >
          Generate Quote
        </button>
        <button
          onClick={saveQuote}
          disabled={!projectId || !totalCost}
          style={{
            backgroundColor: (!projectId || !totalCost) ? '#a1c8f0' : '#007bff',
            color: '#fff',
            padding: '12px 20px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: (!projectId || !totalCost) ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.3s ease-in-out',
          }}
        >
          Save Quote
        </button>
      </div>

      {/* Display Generated Quote PDF */}
      {generatedQuote && (
        <div style={{ marginTop: '20px', width: '100%' }}>
          <h3 style={{ marginBottom: '10px' }}>Generated Quote</h3>
          <iframe
            src={generatedQuote}
            width='100%'
            height='600px'
            title='Generated Quote'
            style={{
              border: '2px solid #007bff',
              borderRadius: '8px',
              boxShadow: '2px 2px 10px rgba(0,0,0,0.2)',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default QuoteManager;
