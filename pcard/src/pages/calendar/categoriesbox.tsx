import { useState } from "react";
import { Card, Checkbox, Modal, Button, Input, List, Space } from "antd";
import { SettingOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import "./index.css";

type CategoriesBoxProps = {
    categories: string[];
    selected: string[];
    onSelect: (selected: string[]) => void;
    onCategoriesChange: (categories: string[]) => void;
};


export const CategoriesBox: React.FC<CategoriesBoxProps> = ({
    categories = [],
    selected = [],
    onSelect,
    onCategoriesChange,
}) => {
    // Kiválasztott (filter) kategóriák
    const [checked, setChecked] = useState<string[]>(selected);

    // Szerkesztő modal állapotok
    const [modalOpen, setModalOpen] = useState(false);
    const [categoryList, setCategoryList] = useState<string[]>(categories);
    const [newCategory, setNewCategory] = useState("");

    // Kategória kiválasztása (checkbox)
    const onCheckboxChange = (checkedValues: string[]) => {
        setChecked(checkedValues);
        if (onSelect) onSelect(checkedValues);
    };

    // Settings modal kezelése
    const handleDelete = (cat: string) => {
        const newList = categoryList.filter(c => c !== cat);
        setCategoryList(newList);
        if (onCategoriesChange) onCategoriesChange(newList);
    };

    const handleAdd = () => {
        if (newCategory && !categoryList.includes(newCategory)) {
            const newList = [...categoryList, newCategory];
            setCategoryList(newList);
            setNewCategory("");
            if (onCategoriesChange) onCategoriesChange(newList);
        }
    };

    return (
        <>
            <Card
                title={<span><span role="img" aria-label="flag">🚩</span> Categories</span>}
                extra={
                    <Button
                        icon={<SettingOutlined />}
                        size="small"
                        type="text"
                        onClick={() => setModalOpen(true)}
                    />
                }
                className="calendar-categories-card"
            >
                <Checkbox.Group
                    value={checked}
                    onChange={onCheckboxChange}
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                    {categoryList.map(cat => (
                        <Checkbox value={cat} key={cat}>{cat}</Checkbox>
                    ))}
                </Checkbox.Group>
            </Card>

            <Modal
                title="Manage Categories"
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
            >
                <List
                    dataSource={categoryList}
                    renderItem={cat => (
                        <List.Item
                            actions={[
                                <Button
                                    icon={<DeleteOutlined />}
                                    type="text"
                                    danger
                                    onClick={() => handleDelete(cat)}
                                />
                            ]}
                        >
                            {cat}
                        </List.Item>
                    )}
                />
                <Space style={{ marginTop: 16 }}>
                    <Input
                        placeholder="Add category"
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        onPressEnter={handleAdd}
                    />
                    <Button icon={<PlusOutlined />} onClick={handleAdd} />
                </Space>
            </Modal>
        </>
    );
};
