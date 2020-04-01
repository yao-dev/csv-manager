import { Button, Checkbox, Divider, Icon, Input, message, Modal, Select, Table, Tag, Upload } from 'antd';
import 'antd/dist/antd.css';
import axios from 'axios';
import { get, omit } from 'lodash';
import React, { Component } from 'react';
import { CSVLink } from 'react-csv';
import Highlighter from 'react-highlight-words';
import { Resizable } from 'react-resizable';
import 'react-virtualized/styles.css'; // only needs to be imported once
import './App.css';

const API = axios.create({
  baseURL: 'https://csv-manager.now.sh/api',
});

// const Uppy = require('@uppy/core')
// const XHRUpload = require('@uppy/xhr-upload')

//   <CSVLink data={this.state.csvData.data}>Download me</CSVLink>

const ResizeableTitle = (props) => {
  const { onResize, width, ...restProps } = props;

  if (!width) {
    return <th {...restProps} />;
  }

  return (
    <Resizable
      width={width}
      draggableOpts={{ enableUserSelectHack: false }}
      height={0}
      onResize={onResize}
    >
      <th {...restProps} />
    </Resizable>
  );
};

const selectUrlPrefix = (
  <Select defaultValue="http://">
    <Select.Option value="http://">http://</Select.Option>
    <Select.Option value="https://">https://</Select.Option>
  </Select>
);

const filters = [{
  name: 'Equal to',
  value: 'equalTo'
}, {
  name: 'Start with',
  value: 'startsWith'
}, {
  name: 'End with',
  value: 'endsWith'
}, {
  name: 'Contains',
  value: 'contains'
}, {
  name: 'Regex',
  value: 'regex'
}, {
  name: 'Exclude',
  value: 'exclude'
}, {
  name: 'Equal or greater than',
  value: 'equalOrGreaterThan'
}, {
  name: 'Equal or less than',
  value: 'equalOrLessThan'
}, {
  name: 'Between',
  value: 'between'
},
]

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      fileName: '',
      data: [],
      columns: [],
      meta: {},
      errors: {},
      rowCount: 0,
      visible: false,
      visibleFilter: false,
      confirmLoading: false,
      searchText: '',
      filters: [],
      fields: []
    }

    // this.uppy = Uppy({
    //   debug: true,
    //   restrictions: {
    //     maxNumberOfFiles: 1,
    //     restrictions: {
    //       allowedFileTypes: ['text/csv']
    //     }
    //   },
    //   autoProceed: true,
    //   onBeforeFileAdded: (currentFile, files) => {
    //     console.log(currentFile)
    //     return true;
    //   }

    // })

    // this.uppy.use(XHRUpload, {
    //   endpoint: 'http://localhost:3001/',
    //   // method: 'post',
    //   formData: true,
    //   fieldName: 'test'
    // })
  }

  // componentDidMount() {
  //   this.uppy.on('upload-success', (file, { body }) => {
  //     this.setState({ csvData: body })
  //   })
  // }

  componentDidMount() {
    // this.loadColumns()
  }

  showModal = () => {
    this.setState({
      visible: true,
    });
  }

  showModalFilter = () => {
    this.setState({
      visibleFilter: true,
    });
  }

  handleOk = () => {
    this.setState({ confirmLoading: true });
  }

  handleCancel = () => {
    this.setState({ visible: false, confirmLoading: false });
  }

  loadColumns = () => {
    const file = localStorage.getItem('file');
    if (!file) return;
    console.log(file)
    this.setState(JSON.parse(file))
  }

  setColumns = (fields = []) => {
    const columns = [];

    if (fields.length) {
      fields.map((field, index) => {
        columns.push({
          title: field,
          dataIndex: field,
          key: index, //Math.random().toString(36).substr(2),
          // width: 200,
          // defaultSortOrder: 'ascend',
          sortDirections: ['descend', 'ascend'],
          // onFilter: (value, record) => record.address.indexOf(value) === 0,
          sorter: (a, b) => a[field] < b[field],
          ...this.getColumnSearchProps(field),
          // ...this.getColumnFilterProps(field),
          onHeaderCell: column => {
            return {
              width: column.width,
              onResize: this.handleResize(index),
            }
          },
        })
      })
    }

    return columns
  }

  handleUpload = (info) => {
    const status = info.file.status;

    if (status !== 'uploading') {
      this.setState({ confirmLoading: true });
    }

    if (status === 'done') {
      const fileList = get(info, 'fileList[0]', {})
      const fileName = get(fileList, 'name', '');
      const data = get(fileList, 'response.data', []);
      const meta = get(fileList, 'response.meta', {});
      const errors = get(fileList, 'response.errors', {});
      const rowCount = data.length

      console.log(meta)

      message.success(`${info.file.name} file uploaded successfully.`);

      const columns = this.setColumns(meta.fields)
      const file = {
        fields: meta.fields,
        fileName,
        data,
        meta,
        rowCount,
        columns,
      }

      // localStorage.setItem('file', JSON.stringify(file))

      return this.setState({
        ...file,
        newFileName: fileName,
        errors,
        confirmLoading: false,
        visible: false,
      })
    } else if (status === 'error') {
      message.error(`${info.file.name} file upload failed.`);
      this.setState({ confirmLoading: false });
    }
  }

  handleFileName = (e, value) => {
    if (!e && !this.state.newFileName.trim()) {
      return this.setState({ newFileName: this.state.fileName })
    }

    if (e) {
      return this.setState({ newFileName: e.target.value.trim() })
    }
  }

  handleResize = index => (e, { size }) => {
    this.setState(({ columns }) => {
      const nextColumns = [...columns];
      nextColumns[index] = {
        ...nextColumns[index],
        width: size.width,
      };
      return { columns: nextColumns };
    });
  };

  components = {
    header: {
      cell: ResizeableTitle,
    },
  };

  getColumnSearchProps = (dataIndex) => ({
    filterDropdown: ({
      setSelectedKeys, selectedKeys, confirm, clearFilters,
    }) => (
      <div style={{ padding: 8 }}>
        <Input
          ref={node => { this.searchInput = node; }}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => this.handleSearch(selectedKeys, confirm)}
          style={{ width: 188, marginBottom: 8, display: 'block' }}
        />
        <Button
          type="primary"
          onClick={() => this.handleSearch(selectedKeys, confirm)}
          icon="search"
          size="small"
          style={{ width: 90, marginRight: 8 }}
        >
          Search
        </Button>
        <Button
          onClick={() => this.handleReset(clearFilters)}
          size="small"
          style={{ width: 90 }}
        >
          Reset
        </Button>
      </div>
    ),
    filterIcon: filtered => <Icon type="search" style={{ color: filtered ? '#1890ff' : undefined }} />,
    onFilter: (value, record) => record[dataIndex].toString().toLowerCase().includes(value.toLowerCase()),
    onFilterDropdownVisibleChange: (visible) => {
      if (visible) {
        setTimeout(() => this.searchInput.select());
      }
    },
    render: (text) => (
      <Highlighter
        highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
        searchWords={[this.state.searchText]}
        autoEscape
        textToHighlight={text.toString()}
      />
    ),
  })

  // getColumnFilterProps = (dataIndex) => ({
  //   filterDropdown: ({
  //     setSelectedKeys, selectedKeys, confirm, clearFilters,
  //   }) => {
  //     return (
  //       <div
  //         style={{
  //           padding: 10,
  //           display: 'flex',
  //           width: 300,
  //           flexFlow: 'row wrap'
  //         }}
  //       >
  //         <Select
  //           onChange={this.handleFilterName}
  //           placeholder='Choose your filter'
  //           style={{ width: '100%' }}
  //         >
  //           {filters.map((filter, index) => {
  //             return (
  //               <Select.Option
  //                 key={index}
  //                 value={filter.value}
  //               >
  //                 {filter.name}
  //               </Select.Option>
  //             )
  //           })}
  //         </Select>
  //         {this.getFormFilter()}
  //       </div>
  //   )},
  //   filterIcon: filtered => <Icon type="filter" style={{ color: filtered ? '#1890ff' : undefined }} />,
  //   onFilter: (value, record) => console.log(value, record),
  //   onFilterDropdownVisibleChange: (visible) => {
  //     console.log('onFilterDropdownVisibleChange', visible, dataIndex)
  //     if (visible) {
  //       this.currentColumnFilter = dataIndex
  //     } else {
  //       this.currentColumnFilter = null
  //     }
  //   },
  // })

  handleSearch = (selectedKeys, confirm) => {
    confirm();
    this.setState({ searchText: selectedKeys[0] });
  }

  handleReset = (clearFilters) => {
    clearFilters();
    this.setState({ searchText: '' });
  }

  handleFilterField = (fieldName) => {
    this.setState({ fieldName, isCaseSensitive: false, filterValue: null })
  }

  handleFilterName = (filterName) => {
    this.setState({ filterName })
  }

  getField = (Component, props = {}) => {
    return (
      <div style={{ width: '100%', marginBottom: 10 }}>
        <Component {...props} />
      </div>
    )
  }

  getEqualToForm = () => {
    this.myRef = React.createRef();
    return (
      <div>
        {/* EQUAL TO, INPUT */}
        <div style={{ width: '100%', marginBottom: 10 }}>
          <Input
            ref={this.myRef}
            placeholder='Equal to'
            style={{ width: '100%' }}
            onChange={(e) => this.setState({ filterValue: e.target.value })}
          />
        </div>
        {/* CHECKBOX */}
        <div style={{ width: '100%', marginBottom: 10 }}>
          <Checkbox
            ref='checkboxFilter'
            style={{ width: '100%' }}
            onChange={(e) => this.setState({  isCaseSensitive: e.target.checked })}
            children='Case sensitive'
          />
        </div>
      </div>
    )
  }

  getStartsWithForm = () => {
    return (
      <>
        <Input placeholder='Start with' onChange={(e) => this.setState({ filterValue: e.target.value })} />
        <Checkbox onChange={(e) => this.setState({ isCaseSensitive: e.target.checked })}>Case sensitive</Checkbox>
      </>
    )
  }

  getEndsWithForm = () => {
    return (
      <>
        <Input placeholder='End with' onChange={(e) => this.setState({ filterValue: e.target.value })} />
        <Checkbox onChange={(e) => this.setState({ isCaseSensitive: e.target.checked })}>Case sensitive</Checkbox>
      </>
    )
  }

  getContainsForm = () => {
    return (
      <>
        <Select
          mode='tags'
          style={{ width: '100%' }}
          placeholder='Contains words'
          onChange={(value) => this.setState({ filterValue: value })}
        >
          {Array.isArray(this.state.filterValue) ? this.state.filterValue.map((tag, index) => {
            return (
              <Select.Option
                key={index}
                value={tag}
              >
                {tag}
              </Select.Option>
            )
          }) : null }
        </Select>
      </>
    );
  }

  getRegexForm = () => {
    return (
      <>
        <Input placeholder='Regex' onChange={(e) => this.setState({ filterValue: e.target.value })} />
        <Checkbox onChange={(e) => this.setState({ isCaseSensitive: e.target.checked })}>Case sensitive</Checkbox>
      </>
    )
  }

  getExcludeForm = () => {
    return (
      <>
        <Select
          mode='tags'
          style={{ width: '100%' }}
          placeholder='Exclude words'
          onChange={(value) => this.setState({ filterValue: value })}
        >
          {Array.isArray(this.state.filterValue) ? this.state.filterValue.map((tag, index) => {
            return (
              <Select.Option
                key={index}
                value={tag}
              >
                {tag}
              </Select.Option>
            )
          }) : null }
        </Select>
      </>
    );
  }

  getEqualOrLessThanForm = () => {
    return (
      <Input placeholder='Less than' onChange={(e) => this.setState({ filterValue: e.target.value })} />
    )
  }

  getEqualOrGreaterThanForm = () => {
    return (
      <Input placeholder='Greater than' onChange={(e) => this.setState({ filterValue: e.target.value })} />
    )
  }

  getBetweenForm = () => {
    return (
      <>
        <Input placeholder='Min' onChange={(e) => this.setState({ min: e.target.value })} />
        <Input placeholder='Max' onChange={(e) => this.setState({ max: e.target.value })} />
      </>
    )
  }

  addFilter = () => {
    const filters = [...this.state.filters];

    if (!this.state.fieldName) {
      return this.setState({
        filterValue: null,
        isCaseSensitive: false,
        fieldName: null,
        visibleFilter: false,
      })
    }

    filters.push(this.cleanFilter({
      field: this.state.fieldName,
      type: this.state.filterName,
      toMatch: this.state.filterValue,
      sensitive: this.state.isCaseSensitive,
      min: this.state.min,
      max: this.state.max,
    }))

    this.setState({
      filters,
      filterValue: null,
      isCaseSensitive: false,
      fieldName: null,
      visibleFilter: false,
    })

    this.submitFilter(filters)
  }

  cleanFilter = (filter) => {
    switch (this.state.filterName) {
      case 'equalTo':
        return omit(filter, ['min', 'max'])
      case 'startsWith':
        return omit(filter, ['min', 'max'])
      case 'endsWith':
        return omit(filter, ['min', 'max'])
      case 'contains':
        return omit(filter, ['min', 'max'])
      case 'regex':
        return omit(filter, ['min', 'max'])
      case 'exclude':
        return omit(filter, ['min', 'max'])
      case 'equalOrGreaterThan':
        return omit(filter, ['sensitive', 'min', 'max'])
      case 'equalOrLessThan':
        return omit(filter, ['sensitive', 'min', 'max'])
      case 'between':
        return omit(filter, ['toMatch', 'sensitive'])
      default:
        return filter;
    }
  }

  getFormFilter = () => {
    switch (this.state.filterName) {
      case 'equalTo':
        return this.getEqualToForm();
      case 'startsWith':
        return this.getStartsWithForm();
      case 'endsWith':
        return this.getEndsWithForm();
      case 'contains':
        return this.getContainsForm();
      case 'regex':
        return this.getRegexForm();
      case 'exclude':
        return this.getExcludeForm();
      case 'equalOrGreaterThan':
        return this.getEqualOrGreaterThanForm();
      case 'equalOrlessThan':
        return this.getEqualOrLessThanForm();
      case 'between':
        return this.getBetweenForm();
      default:
        return null;
    }
  }

  submitFilter = async (filters) => {
    this.setState({ confirmLoading: true })
    try {
      const { data } = await API.post('/filter', {
        fileName: this.state.fileName,
        filters: filters || this.state.filters,
      })
      console.log(data)
      this.setState({ visibleFilter: false, confirmLoading: false, data, rowCount: data.length })
    } catch (e) {
      this.setState({ confirmLoading: false })
    }
  }

  importFileComponent = () => {
    return (
      <div>
        <Upload.Dragger
          name={'csv'}
          multiple={false}
          accept={'text/csv'}
          action={'https://csv-manager.now.sh/api/upload'}
          onChange={this.handleUpload}
        >
          <p className="ant-upload-drag-icon">
            <Icon type="file" />
          </p>
          <p className="ant-upload-text">Click or drag file to this area to upload</p>
          <p className="ant-upload-hint">Support for a csv. Strictly prohibit from uploading company data or other band files</p>
        </Upload.Dragger>

        <p>or</p>

        <div style={{ marginBottom: 16 }}>
          <Input addonBefore={selectUrlPrefix} />
        </div>

        <Divider />
      </div>
    )
  }

  render() {
    const { visible, visibleFilter, confirmLoading } = this.state;

    console.log(this.state.columns)

    return (
      <div className="App">
        <h1>CSV FILTER</h1>

        {this.state.data.length ? (
          <div>
            <Button type="primary" onClick={this.showModal}>
              Import file (.csv, .json, url)
            </Button>
            <CSVLink data={this.state.data}>Download me</CSVLink>
            <Tag onClick={this.showModalFilter} style={{ background: '#fff', borderStyle: 'dashed' }}>
              <Icon type="plus" /> Add a filter
            </Tag>
            {/* <Pagination
              total={this.state.data.length}
              showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
              pageSize={20}
              defaultCurrent={1}
              showQuickJumper
            /> */}

            <div>
              <Input
                defaultValue={this.state.newFileName}
                value={this.state.newFileName}
                onChange={this.handleFileName}
                onBlur={() => this.handleFileName()}
              />
            </div>

            {this.state.filters.map((i, index) => {
              let filters = [...this.state.filters]
              let content = `column: ${i.field} | type: ${i.type} | ${i.toMatch ? `value: ${i.toMatch}` : `min: ${i.min}, max: ${i.max}`}`;
              content = i.toMatch ? `${content} | sensitive: ${i.sensitive ? true : false}` : content
              return (
                <Tag
                  onClose={() => {
                    filters.splice(index, 1)
                    this.setState({ filters })
                    this.submitFilter(filters)
                  }}
                  closable
                  style={{ background: '#fff', borderStyle: 'dashed' }}
                >
                  {content}
                </Tag>
              )
            })}

            {/* COLUMN CUSTOM */}
            <Select
              style={{ width: 240 }}
              value={this.state.columns.map(i => i.title)}
              firstActiveValue='test'
              maxTagCount={0}
              mode="multiple"
              placeholder="Column: default"
              showArrow
              size='small'
              suffixIcon={<Icon type="list" />}
              dropdownRender={menu => (
                <div>
                  {menu}
                  <Divider style={{ margin: '4px 0' }} />
                  <div
                    style={{ padding: '4px 8px', cursor: 'pointer' }}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {}}
                  >
                    <Icon type="plus" /> Save columns
                  </div>
                </div>
              )}
            >
              {this.state.columns.map((item, index) => (
                <Select.Option key={item.dataIndex}>{item.title}</Select.Option>
              ))}
            </Select>

            <Table
              // title='CSV TITLE'
              bordered
              components={this.components}
              dataSource={this.state.data.length ? this.state.data : null }
              columns={this.state.columns}
              rowKey={() => Math.random().toString(36).substr(2)}
              pagination={{ position: 'both' }}
              loading={false}
              size='small'
            />
            {/* <Pagination
              total={this.state.data.length}
              showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
              pageSize={20}
              defaultCurrent={1}
              showQuickJumper
              showSizeChanger
            /> */}
          </div>
        ) : this.importFileComponent() }
        <Modal
          title='Import new file'
          visible={visible}
          onOk={() => this.setState({ visible: false, confirmLoading: true })}
          onCancel={() => this.setState({ visible: false, confirmLoading: false })}
          confirmLoading={confirmLoading}
        >
          {this.importFileComponent()}
        </Modal>

        <Modal
          title='Add filters'
          visible={visibleFilter}
          onOk={this.addFilter}
          onCancel={() => this.setState({ fieldName: null, visibleFilter: false, confirmLoading: false })}
          confirmLoading={confirmLoading}
        >
          <div
            style={{
              padding: 10,
              display: 'flex',
              width: 300,
              flexFlow: 'row wrap'
            }}
          >
            <Select
              onChange={this.handleFilterField}
              placeholder='Select column'
              style={{ width: '100%' }}
            >
              {this.state.fields.map((field, index) => {
                return (
                  <Select.Option
                    key={index}
                    value={field}
                  >
                    {field}
                  </Select.Option>
                )
              })}
            </Select>
            <Select
              onChange={this.handleFilterName}
              placeholder='Choose your filter'
              style={{ width: '100%' }}
              disabled={!this.state.fieldName}
            >
              {this.state.fieldName && filters.map((filter, index) => {
                return (
                  <Select.Option
                    key={index}
                    value={filter.value}
                  >
                    {filter.name}
                  </Select.Option>
                )
              })}
            </Select>
            {this.getFormFilter()}
          </div>
        </Modal>
      </div>
    );
  }
}

export default App;
