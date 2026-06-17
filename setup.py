from setuptools import setup, find_packages

setup(
    name="airm-toolkit",
    version="0.1.0",
    description="Python toolkit for the IATA Air Mercury (AIRM 615) business simulation: "
                 "cost, revenue, and demand calculations for route/fleet decision-making.",
    packages=find_packages(exclude=["tests", "tests.*"]),
    package_data={"airm_toolkit": []},
    include_package_data=True,
    python_requires=">=3.9",
    extras_require={
        "dev": ["pytest>=7.0"],
    },
)
