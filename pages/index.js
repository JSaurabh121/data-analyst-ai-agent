import React, { useState, useRef } from 'react';
import { Upload, FileText, BarChart3, TrendingUp, PieChart, Download, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import * as d3 from 'd3';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart as RechartsPieChart, Cell } from 'recharts';

const DataAnalystAgent = () => {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState([]);
  const fileInputRef = useRef(null);

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);

    Papa.parse(uploadedFile, {
      complete: (result) => {
        const cleanData = result.data.filter(row => 
          Object.values(row).some(value => value !== null && value !== undefined && value !== '')
        );
        setData(cleanData);
        setColumns(Object.keys(cleanData[0] || {}));
        performAnalysis(cleanData);
        setLoading(false);
      },
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true
    });
  };

  const performAnalysis = (csvData) => {
    if (!csvData.length) return;

    const numericColumns = columns.filter(col => 
      csvData.some(row => typeof row[col] === 'number' && !isNaN(row[col]))
    );

    const categoricalColumns = columns.filter(col => 
      csvData.some(row => typeof row[col] === 'string')
    );

    // Basic statistics
    const stats = numericColumns.reduce((acc, col) => {
      const values = csvData.map(row => row[col]).filter(val => typeof val === 'number' && !isNaN(val));
      if (values.length > 0) {
        acc[col] = {
          mean: d3.mean(values),
          median: d3.median(values),
          min: d3.min(values),
          max: d3.max(values),
          count: values.length
        };
      }
      return acc;
    }, {});

    // Correlation analysis (simplified)
    const correlations = {};
    numericColumns.forEach(col1 => {
      numericColumns.forEach(col2 => {
        if (col1 !== col2) {
          const values1 = csvData.map(row => row[col1]).filter(val => typeof val === 'number');
          const values2 = csvData.map(row => row[col2]).filter(val => typeof val === 'number');
          
          if (values1.length > 1 && values2.length > 1) {
            const correlation = calculateCorrelation(values1, values2);
            correlations[`${col1}-${col2}`] = correlation;
          }
        }
      });
    });

    // Category distributions
    const distributions = categoricalColumns.reduce((acc, col) => {
      const counts = {};
      csvData.forEach(row => {
        const value = row[col];
        if (value) {
          counts[value] = (counts[value] || 0) + 1;
        }
      });
      acc[col] = Object.entries(counts).map(([name, value]) => ({ name, value }));
      return acc;
    }, {});

    setAnalysis({
      totalRows: csvData.length,
      totalColumns: columns.length,
      numericColumns,
      categoricalColumns,
      statistics: stats,
      correlations,
      distributions
    });
  };

  const calculateCorrelation = (x, y) => {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    
    const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
    const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
    const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  };

  const generateInsights = () => {
    if (!analysis) return [];

    const insights = [];
    
    // Data overview insights
    insights.push(`Dataset contains ${analysis.totalRows} rows and ${analysis.totalColumns} columns.`);
    
    if (analysis.numericColumns.length > 0) {
      insights.push(`Found ${analysis.numericColumns.length} numeric columns: ${analysis.numericColumns.join(', ')}.`);
    }
    
    if (analysis.categoricalColumns.length > 0) {
      insights.push(`Found ${analysis.categoricalColumns.length} categorical columns: ${analysis.categoricalColumns.join(', ')}.`);
    }

    // Statistical insights
    Object.entries(analysis.statistics).forEach(([col, stats]) => {
      if (stats.max - stats.min > 0) {
        insights.push(`${col} ranges from ${stats.min.toFixed(2)} to ${stats.max.toFixed(2)} with an average of ${stats.mean.toFixed(2)}.`);
      }
    });

    // Correlation insights
    const strongCorrelations = Object.entries(analysis.correlations)
      .filter(([, corr]) => Math.abs(corr) > 0.7)
      .slice(0, 3);
    
    strongCorrelations.forEach(([pair, corr]) => {
      const [col1, col2] = pair.split('-');
      insights.push(`Strong ${corr > 0 ? 'positive' : 'negative'} correlation (${corr.toFixed(2)}) between ${col1} and ${col2}.`);
    });

    return insights;
  };

  const exportReport = () => {
    const insights = generateInsights();
    const reportContent = [
      'Data Analysis Report',
      '=' .repeat(20),
      '',
      'Dataset Overview:',
      `- Total Rows: ${analysis.totalRows}`,
      `- Total Columns: ${analysis.totalColumns}`,
      `- Numeric Columns: ${analysis.numericColumns.join(', ')}`,
      `- Categorical Columns: ${analysis.categoricalColumns.join(', ')}`,
      '',
      'Key Insights:',
      ...insights.map(insight => `- ${insight}`),
      '',
      'Statistical Summary:',
      ...Object.entries(analysis.statistics).map(([col, stats]) => 
        `${col}: Mean=${stats.mean.toFixed(2)}, Median=${stats.median.toFixed(2)}, Range=[${stats.min}-${stats.max}]`
      )
    ].join('\n');

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data-analysis-report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            <BarChart3 className="inline-block mr-3 text-indigo-600" />
            Data Analyst Agent
          </h1>
          <p className="text-gray-600 text-lg">Upload your CSV file and get instant insights</p>
        </div>

        {/* File Upload */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">Upload CSV File</p>
            <p className="text-gray-500 mb-4">Drag and drop or click to select</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Choose File
            </button>
            {file && (
              <p className="mt-4 text-sm text-gray-600">
                Selected: {file.name}
              </p>
            )}
          </div>
        </div>

        {loading && (
          <div className="text-center py-8">
            <Loader2 className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600">Analyzing your data...</p>
          </div>
        )}

        {analysis && !loading && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Total Rows</p>
                    <p className="text-2xl font-bold text-gray-900">{analysis.totalRows}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Columns</p>
                    <p className="text-2xl font-bold text-gray-900">{analysis.totalColumns}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Numeric</p>
                    <p className="text-2xl font-bold text-gray-900">{analysis.numericColumns.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <PieChart className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Categorical</p>
                    <p className="text-2xl font-bold text-gray-900">{analysis.categoricalColumns.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Insights */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Key Insights</h2>
                <button
                  onClick={exportReport}
                  className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </button>
              </div>
              <div className="grid gap-4">
                {generateInsights().map((insight, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Statistical Summary */}
            {Object.keys(analysis.statistics).length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Statistical Summary</h2>
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Column</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Mean</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Median</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Min</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Max</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(analysis.statistics).map(([col, stats]) => (
                        <tr key={col} className="border-t">
                          <td className="px-4 py-3 font-medium text-gray-900">{col}</td>
                          <td className="px-4 py-3 text-gray-600">{stats.mean.toFixed(2)}</td>
                          <td className="px-4 py-3 text-gray-600">{stats.median.toFixed(2)}</td>
                          <td className="px-4 py-3 text-gray-600">{stats.min.toFixed(2)}</td>
                          <td className="px-4 py-3 text-gray-600">{stats.max.toFixed(2)}</td>
                          <td className="px-4 py-3 text-gray-600">{stats.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Numeric Data Visualization */}
              {analysis.numericColumns.length > 0 && data.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Numeric Data Trends</h3>
                  <LineChart width={500} height={300} data={data.slice(0, 50)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={analysis.categoricalColumns[0] || 'index'} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {analysis.numericColumns.slice(0, 3).map((col, index) => (
                      <Line 
                        key={col} 
                        type="monotone" 
                        dataKey={col} 
                        stroke={colors[index]} 
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </div>
              )}

              {/* Category Distribution */}
              {Object.keys(analysis.distributions).length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Category Distribution</h3>
                  {Object.entries(analysis.distributions).slice(0, 1).map(([col, dist]) => (
                    <div key={col}>
                      <p className="text-gray-600 mb-4">{col}</p>
                      <RechartsPieChart width={500} height={300}>
                        <pie
                          data={dist.slice(0, 8)}
                          cx={250}
                          cy={150}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {dist.slice(0, 8).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                          ))}
                        </pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// This is the key difference for Next.js - we export as default
export default DataAnalystAgent;